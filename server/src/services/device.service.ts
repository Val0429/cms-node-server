
import { Request, Response } from 'express';
import { Nvr, Device, Group, EventHandler, RecordSchedule } from '../domain';
import { ParseHelper } from '../helpers';
import { CoreService, NotificationBody } from './core.service';
import { IGroupChannel } from 'lib/domain/core';

const parseService = ParseHelper.instance;
const coreService = CoreService.instance;

export class DeviceService {
    busy:boolean;
    deviceCount:number;
    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: DeviceService;

    constructor() {                
        this.busy = false;
    }
    getDeviceStatus(res:Response){
        //let deviceCount = await this.getDeviceCount();
        res.json({busy:this.busy, deviceCount:this.deviceCount});
    }
    async cloneDevice(req:Request, res:Response){
        try{
            if(this.busy===true){
                res.status(429);
                res.json({message:"server is busy"});
                return;
            }
            coreService.auth = req.body.auth;     
            let { nvrObjectId, cam, quantity, account, password } = req.body;         
            
            let availableLicense = await this.getLicenseAvailableCount("00171");
            if(availableLicense < quantity){
                throw new Error("Not enough license");
            }

            if(!nvrObjectId){
                let nvr = await this.getDefaultNvr();
                nvrObjectId= nvr.id;
            }
            
            
            await this.getGroupList().then(async groupList =>{
                await this.cloneCam(cam, quantity, nvrObjectId, groupList, account, password);
            });
            
            await this.getDeviceCount().then(count=> {
                this.deviceCount = count;
                let target = this.deviceCount + quantity;
                res.json({message:"success", target});
            });
            
        }
        catch(err){
            console.error(err);
            res.status(err.status || 500);
            res.json({
                message: err.message,
                error: err
            });
        }
        
    }
    private async getDeviceCount(nvrId?:string):Promise<number>{
        
        if(nvrId){
            return await parseService
                .countFetch({type:Device, 
                    filter:query=>query
                    .equalTo("NvrId", nvrId)
                    .limit(Number.MAX_SAFE_INTEGER)})
        }
        else{
            return await parseService
            .countFetch({type:Device, 
                filter:query=>query
                .limit(Number.MAX_SAFE_INTEGER)})
            
        }
    }
    async getDeviceCountByNvrId(req:Request, res:Response){
        let nvrId = req.params["nvrId"];        
        let count = await this.getDeviceCount(nvrId);
        res.json({count});
    }
    async get(req:Request, res:Response){
        
        let nvrId = req.query["nvrId"];
        let page = parseInt(req.query["page"]);
        let pageSize = parseInt(req.query["pageSize"]);                
        
        let devices = await parseService.fetchData({
            type: Device,
            filter: query=>query
                .equalTo("NvrId", nvrId)
                .limit(pageSize)
                .skip((page-1)*pageSize)
        });
        
        res.json(devices);
    }
    async getNewChannel(req:Request, res:Response){
        let nvrId = req.params["nvrId"];
        let count = parseInt(req.params["count"] || "1");
        if(!nvrId){
            let nvr = await parseService.getData({
                type: Nvr,
                filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
              });

            nvrId = nvr.Id;
        }
        let result = await this.getNewChannelArray(nvrId, count);
        
        res.json(result);
    }
    private async getNewChannelArray(nvrId: any, count: number) {
        
        let result = [];        
        let data = await this.getAllDevice(nvrId);
        let occupiedChannels = data.map(e => e.Channel);        
        let channel = 0;        
        while (result.length < count) {            
            channel++;
            // find empty channel
            let found = occupiedChannels.find(Channel => Channel == channel);            
            if(found) continue;
            result.push(channel);
        }
        return result;
    }

    private async getAllDevice(nvrId:string) {
        return await parseService.fetchData({
            type: Device,
            filter: query =>                 
                query
                .equalTo('NvrId', nvrId)
                .ascending("Channel")
                .limit(Number.MAX_SAFE_INTEGER)
                
        });
    }

    async getDefaultNvr():Promise<Nvr>{
        return parseService.getData({
            type: Nvr,
            filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
          });
    }

    async post(req:Request, res:Response){
        try{
            let {cams, selectedSubGroup, auth, nvrObjectId} = req.body;
            coreService.auth = auth;            
            let groupList:Group [] = [] ;
            let nvr:Nvr;
            await Promise.all([
                this.getGroupList().then(groups=>groupList = groups),
                parseService.getDataById({type:Nvr, objectId:nvrObjectId}).then(res=>nvr=res)
            ]);
            
            let promises=[];
            let channels = await this.getNewChannelArray(nvr.Id, cams.length);
            
            for(let i=0;i<cams.length;i++){
                let cam=cams[i];
                let dev:Device;

                if(cam.objectId){
                    dev = await parseService.getDataById({type:Device, objectId:cam.objectId});
                }else{
                    dev = new Device();
                }

                this.assignDeviceProperties(dev, cam);
                
                if(dev.Channel==0){                                    
                    dev.Channel = channels[i];                
                    if(dev.Name == "New Camera 0")dev.Name = `New Camera ${dev.Channel}`;                    
                }

                promises.push(this.saveCamera(dev, nvrObjectId));
                const setGroup = this.setChannelGroup(groupList, { Nvr: dev.NvrId, Channel: dev.Channel }, selectedSubGroup);
                promises.push(setGroup)
            }     
            
            //we put save group at the last process to prevent overwritten by concurrent processes
            await Promise.all(promises);            
            
            await this.saveGroupList(groupList);
            
            res.json({message:"success"});
        }
        catch(err){
            console.error("error saving camera", err);
            res.status(err.status || 500);
            res.json({
                message: err.message,
                error: err
            });
        }finally{

        }
    }
    
    private async saveGroupList(groupList: Group[]) {
        let promises=[];
        groupList.forEach(group => {            
            promises.push(group.save());
        });
        await Promise.all(promises);
    }

    private assignDeviceProperties(dev: Device, cam: any) {
        dev.Config = Object.assign({}, cam.Config);
        dev.Capability = Object.assign({}, cam.Capability);
        dev.CameraSetting = Object.assign({}, cam.CameraSetting);
        dev.Tags = Object.assign([], cam.Tags);
        dev.Name = cam.Name;
        dev.NvrId = cam.NvrId;
        dev.Channel = cam.Channel;
    }

    async saveCamera(cam:Device, nvrObjectId:string):Promise<Device>{        
        
        const saveCam = cam.save().then(async result => {            
            await coreService.notify([{path: coreService.urls.URL_CLASS_NVR, objectId: nvrObjectId},
                {path: coreService.urls.URL_CLASS_DEVICE, objectId: result.id}]);
        });
        await Promise.all([saveCam,                        
            this.updateRecordScheduleByDevice(cam)]);
        return cam;
      }

    private async getRecorScheduleByDevice(currentCamera:Device):Promise<RecordSchedule[]> {        
        return await parseService.fetchData({
            type: RecordSchedule,
            filter: query => query        
              .equalTo('NvrId', currentCamera.NvrId)
              .equalTo('ChannelId', currentCamera.Channel)
              .limit(30000)
          });
    }
      
    private async updateRecordScheduleByDevice(currentCamera:Device):Promise<void>{
        if(!currentCamera.Config.Stream || currentCamera.Config.Stream.length==0)return;
    
        let schedules = await this.getRecorScheduleByDevice(currentCamera);
        let notifications=[];
        let deletedScheduleStream = [];
        for(let stream of schedules){
          let find = currentCamera.Config.Stream.find(x=>x.Id == stream.StreamId)
          if(!find){
               deletedScheduleStream.push(stream);      
               notifications.push({path:coreService.urls.URL_CLASS_RECORDSCHEDULE, objectId:stream.id});
          }
        }
        await Promise.all([Parse.Object.destroyAll(deletedScheduleStream), coreService.notify(notifications)]);
    }

    async getGroupList():Promise<Group[]>{
        
        return await parseService.fetchData({
            type: Group,
            filter:query=>query.limit(Number.MAX_SAFE_INTEGER)
          });
    }
    async delete(req:Request, res:Response){
        try{
            
            if(this.busy===true){
                res.status(429);
                res.json({message:"server is busy"});
                return;
            }

            coreService.auth = req.body.auth;            
            let {nvrObjectId, objectIds} = req.body;

            if(!nvrObjectId){
                let nvr = await this.getDefaultNvr();
                nvrObjectId = nvr.id;
            }
            this.deviceCount = await this.getDeviceCount();            
            let target = this.deviceCount - objectIds.length;
            let groupList = await this.getGroupList();                        
            await this.deleteCamAsync(objectIds, nvrObjectId, groupList);
            res.json({message:"success", target});
        }
        catch(err){
            console.error(err);
            res.status(err.status || 500);
            res.json({
                message: err.message,
                error: err
            });
        }
        
    }    
  

    cloneNewDevice(args: { cam: Device, newChannel: number }, account:string, password:string) {
        
        let obj = new Device();
        
        obj.NvrId = args.cam.NvrId;
        obj.Name = args.cam.Name;
        obj.Channel = args.newChannel;          

        obj.Config = Object.assign({}, args.cam.Config);
        obj.Config.Authentication = Object.assign({}, args.cam.Config.Authentication);
        obj.Config.PTZSupport = Object.assign({}, args.cam.Config.PTZSupport);
        obj.Config["Multi-Stream"] = Object.assign({}, args.cam.Config["Multi-Stream"]);
        obj.Config.Stream=Object.assign([], args.cam.Config.Stream);
    
        obj.Config.Authentication.Account = account;
        obj.Config.Authentication.Password = password;
    
        obj.Capability = Object.assign({}, args.cam.Capability);
        obj.CameraSetting = Object.assign({}, args.cam.CameraSetting);
        obj.CameraSetting.IOPort = Object.assign([], args.cam.CameraSetting.IOPort);
        obj.Tags = Object.assign([], args.cam.Tags);
        
        return obj;
      }
      findDeviceGroup(groupConfigs: Group[], channelData: IGroupChannel): Group {        
        
        const tempGroup = groupConfigs.find(x => x.Level === '1' && x.Channel
            && x.Channel.some(ch => ch.Nvr === channelData.Nvr && ch.Channel === channelData.Channel));    
        
        return tempGroup;
    }
    
  
  
    async cloneCam(cam:Device, quantity:number, nvrObjectId:string, groupList:Group[], account:string, password:string){
      try{
        this.busy = true;
        console.log("clone start", new Date());
        let selectedSubGroup = this.findDeviceGroup(groupList, { Nvr: cam.NvrId, Channel: cam.Channel });        
        
        if(!selectedSubGroup){
            let groups = await parseService.fetchData({
                type:Group, 
                filter:query=>query.equalTo("Name", "Non Main Group").limit(1)
            });
            selectedSubGroup = groups[0];
        }
        let promises=[];        
        let newChannels = await this.getNewChannelArray(cam.NvrId, quantity);
        for (let i = 0; i < quantity; i++) {
            let obj = this.cloneNewDevice({ cam, newChannel: newChannels[i] }, account, password);
            const saveCam = obj.save().then(async result => {         
                let notifications=[];   
                notifications.push({path: coreService.urls.URL_CLASS_NVR, objectId: nvrObjectId });
                notifications.push({path: coreService.urls.URL_CLASS_DEVICE, objectId: result.id});                                
                await coreService.notify(notifications);
            }); 
            const setGroup = this.setChannelGroup(groupList, { Nvr: obj.NvrId, Channel: obj.Channel }, selectedSubGroup.id);
            promises.push(saveCam);
            promises.push(setGroup);
        }       
        //we put save group at the last process to prevent overwritten by concurrent processes        
        await Promise.all(promises);
        await this.saveGroupList(groupList);
        console.log("clone end", new Date());
      }
      catch(err){
        console.error(err);         
      }
      finally{
        this.busy = false;        
      }
    }
    
    private async deleteCamAsync(objectIds:string[], nvrObjectId: any, groupList: Group[]) {
        try{
            this.busy = true;
            let promises=[]
            console.log("delete start", new Date());
            for (let objectId of objectIds) {                
                let delCam = parseService.getDataById({ type: Device, objectId }).then(async cam=>{
                    await Promise.all([this.deleteCam(cam, nvrObjectId, groupList, true), this.deleteCamRelatedData(cam)]);
                });
                promises.push(delCam);
            }
            //we put save group at the last process to prevent overwritten by concurrent processes            
            await Promise.all(promises);
            await this.saveGroupList(groupList);
            console.log("delete end", new Date());
          }
          catch(err){
            console.error(err);            
          }
          finally{
            this.busy = false;            
          }
        
    }
    async deleteCam(cam:Device, nvrObjectId:string, groupList: Group[], notifyNvr:boolean){   
        let notifications=[];
        if(notifyNvr === true){
            notifications.push({
                path: coreService.urls.URL_CLASS_NVR,
                objectId: nvrObjectId
            });
        }
        notifications.push({
            path: coreService.urls.URL_CLASS_DEVICE,
            objectId:cam.id
        });
        let setGroup = this.setChannelGroup(groupList, { Nvr: cam.NvrId, Channel: cam.Channel }, undefined);              
        await Promise.all([cam.destroy(), coreService.notify(notifications), setGroup]);
    }
    async deleteCamRelatedData(cam :Device){  
        
        let promises = [];
        // 刪除與此Camera相關的RecordSchedule
        let delSchedules = parseService.fetchData({
          type: RecordSchedule,
          filter: query => query
            .equalTo('NvrId', cam.NvrId)
            .equalTo('ChannelId', cam.Channel)
        }).then(schedules =>{
            let notifications:NotificationBody[]=[];
            if(!schedules || schedules.length<=0)return;
            promises.push(Parse.Object.destroyAll(schedules));
            schedules.forEach(schedule => {
                notifications.push({ path: coreService.urls.URL_CLASS_RECORDSCHEDULE, objectId: schedule.id });
            });
            promises.push(coreService.notify(notifications));
        });
        
        let delEvents = parseService.fetchData({
          type: EventHandler,
          filter: query => query
            .equalTo('NvrId',  cam.NvrId)
            .equalTo('DeviceId', cam.Channel)
        }).then(handlers => {
            if(!handlers || handlers.length<=0)return;
            let notifications:NotificationBody[]=[];
            promises.push(Parse.Object.destroyAll(handlers));
            handlers.forEach(handler => {
                notifications.push({ path: coreService.urls.URL_CLASS_EVENTHANDLER, objectId: handler.id });
            });
            promises.push(coreService.notify(notifications));
        });
        
        promises.push(delEvents);
        promises.push(delSchedules);        
        await Promise.all(promises);
    }
    findInsertIndexForGroupChannel(data: IGroupChannel[], insertData: IGroupChannel) {
        let insertIndex = 0;
        while (insertIndex < data.length) {
            if (insertData.Nvr === data[insertIndex].Nvr && +(insertData.Channel) < +(data[insertIndex].Channel)) {
                break;
            } else {
                insertIndex++;
            }
        }
        return insertIndex;
    }
    async setChannelGroup(groupConfigs: Group[], newData: IGroupChannel, newGroupId: string) {
        
        const saveList:Group[] = [];

        for(let group of groupConfigs){
            if (group.Channel === undefined) {
                group.Channel = [];
            }
            const item = group.Channel.find(x => x.Nvr === newData.Nvr && x.Channel === newData.Channel);
            // contains Channel but not new group id => remove it
            if (item && group.id !== newGroupId) {
                const index = group.Channel.indexOf(item);
                group.Channel.splice(index, 1);
                saveList.push(group);
            }
            // is new group id but not contains Channel => insert it
            if (newGroupId !== undefined && group.id === newGroupId && !item) {
                const insertIndex = this.findInsertIndexForGroupChannel(group.Channel, newData);
                group.Channel.splice(insertIndex, 0, newData);
                saveList.push(group);
            }
            //console.log("group.Channel", group.Channel);
        };
        let promises = [];        
        for(let group of saveList){                        
            promises.push(coreService.notify([{path:coreService.urls.URL_CLASS_GROUP, objectId:group.id}]));
        }
        await Promise.all(promises);
    }


    /** 取得目前所有的License並計算未過期的數量
     * 格式: key: ProductNo, value: 數量
     */
    async getLicenseLimit(lic) {
        this.licenseLimit = {["00171"]:0};
        
        let result = await coreService.proxyMediaServer({
            method: 'GET',
            path: coreService.urls.URL_MEDIA_LICENSE_INFO
        });
        
            
        if(!result || !result.License) return 0;

        const temp = result.License;
        temp.Adaptor = this.toArray(temp.Adaptor);
        // 分類所有License Key並計算各ProductNo上限總和
        temp.Adaptor.forEach(adp => {
            if (!adp.Key) { return; }
            adp.Key = this.toArray(adp.Key); // 所有已註冊的key
            adp.Key.forEach(key => {
                //console.debug(key.$.ProductNO);
                if (this.licenseLimit[key.$.ProductNO] === undefined) {
                    //console.debug('Cant find this product no.');
                    return;
                }
                if (key.$.Expired === '1') {
                    //console.debug('Key expired.');
                    return;
                }

                this.licenseLimit[key.$.ProductNO] += Number(key.$.Count);
            });
        });
        return this.licenseLimit[lic];
    }
    toArray(data: any) {
        if (!data || Array.isArray(data)) {
            return data;
        } else {
            const tmp = data;
            const result = [];
            result.push(tmp);
            return result;
        }
    }
    /** 各License上限, ex: '00166': 100 */
    licenseLimit: { [key: string]: number } = {};
    /** 取得指定license剩餘可用數量 */
    async getLicenseAvailableCount(lic: string) {
        if (!lic) {
            alert('No available license type.');
            return 0;
        }
        if (lic === 'pass') {
            return Number.MAX_SAFE_INTEGER;
        }
        let usage = await this.getLicenseUsageIPCamera();
        let limit = await this.getLicenseLimit(lic);
        
        return limit - usage;
    }
    async getLicenseUsageIPCamera() {
        let nvr = await parseService.getData({ type: Nvr, 
            filter: query => query.equalTo('Driver', 'IPCamera')
        });

        let usage = await parseService.countFetch({
            type: Device,
            filter: query => query.equalTo('NvrId', nvr.Id).limit(Number.MAX_SAFE_INTEGER)
        });

        return usage;
    }

    async delNvr(req:Request, res:Response){
        try{            
            this.busy = true;
            let {objectIds, auth}=req.body;
            coreService.auth = auth;  
            let groupList = await this.getGroupList();
            let promises=[];
            console.log("delete start", new Date());
            for(let id of objectIds){
               promises.push(parseService.getDataById({type:Nvr, objectId:id}).then(async nvr =>{
                    await this.removeNvrGroup(nvr.Id, groupList);
                    await this.deleteNvr(nvr);                    
                }));
            }
            //we put save group at the last process to prevent overwritten by concurrent processes            
            await Promise.all(promises);
            await this.saveGroupList(groupList);
            console.log("delete end", new Date());
            res.json({message:"success"});
        }
        catch(err){
            console.error(err);
            res.status(err.status || 500);
            res.json({
                message: err.message,
                error: err
            });
        }
        finally{
            this.busy = false;            
        }
          
    }

    async deleteNvr(nvr:Nvr) {
        
        const delDevices = parseService.fetchData({
        type: Device,
        filter: query => query
            .equalTo('NvrId', nvr.Id)
            .ascending('Channel')
            .limit(Number.MAX_SAFE_INTEGER)
        }).then(async devices => {            
            let promises=[];
            devices.forEach(cam=>{
                promises.push(this.deleteCam(cam, nvr.id, [], false));
                promises.push(this.deleteCamRelatedData(cam));
            });            
            await Promise.all(promises);            
        });

        const deleteNvr$ = nvr.destroy().then(async result=>{
           await coreService.notify([{path:coreService.urls.URL_CLASS_NVR, objectId:result.id}]);            
           await delDevices;           
        });
          
        await deleteNvr$;
          
    }
    async removeNvrGroup(nvrId: string, groupList:Group[]) {
        let promises = [];
        for (let group of groupList.filter(x=>x.Nvr && x.Nvr.length>0)){            
            const index = group.Nvr.indexOf(nvrId);
            if(index<0)continue;
            group.Nvr.splice(index, 1);            
            promises.push(coreService.notify([{path:coreService.urls.URL_CLASS_GROUP, objectId:group.id}]));
        }
        return await Promise.all(promises);
    }
}


