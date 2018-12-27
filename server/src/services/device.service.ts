
import { Request, Response } from 'express';
import { Nvr, Device, Group, EventHandler, RecordSchedule } from '../domain';
import { ParseHelper } from '../helpers';
import { CoreService } from './core.service';
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
            
            let groupList = await this.getGroupList();
            this.deviceCount = await this.getDeviceCount();            
            let target = this.deviceCount + quantity;
            //we don't wait clone        
            this.cloneCam(cam, quantity, nvrObjectId, groupList, account, password);
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
            let found=undefined;
            // find empty channel
            do{
                channel++;
                found = occupiedChannels.find(Channel => Channel == channel);	                
            }
            while(found)
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
            let {cam, selectedSubGroup, auth, nvrObjectId} = req.body;
            coreService.auth = auth;            
            
            let dev:Device;

            if(cam.objectId){
                dev = await parseService.getDataById({type:Device, objectId:cam.objectId});
            }else{
                dev = new Device();
            }

            this.assignDeviceProperties(dev, cam);

            let groupList = await this.getGroupList();
            
            if(dev.Channel==0){                
                let channels = await this.getNewChannelArray(dev.NvrId, 1);                               
                dev.Channel = channels[0];                
                if(dev.Name == "New Camera 0")dev.Name = `New Camera ${dev.Channel}`;
            }

            let result = await this.saveCamera(dev, nvrObjectId, groupList, selectedSubGroup);
            res.json(result);
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
    
    private assignDeviceProperties(dev: Device, cam: any) {
        dev.Config = Object.assign({}, cam.Config);
        dev.Capability = Object.assign({}, cam.Capability);
        dev.CameraSetting = Object.assign({}, cam.CameraSetting);
        dev.Tags = Object.assign([], cam.Tags);
        dev.Name = cam.Name;
        dev.NvrId = cam.NvrId;
        dev.Channel = cam.Channel;
    }

    async saveCamera(cam:Device, nvrObjectId:string, groupList:Group[], selectedSubGroup:string):Promise<Device>{

        let result = await cam.save();
          
        coreService.addNotifyData({path: coreService.urls.URL_CLASS_NVR, objectId: nvrObjectId});

        coreService.notifyWithParseResult({parseResult: [result], path: coreService.urls.URL_CLASS_DEVICE});       
          
        await this.setChannelGroup(groupList, { Nvr: cam.NvrId, Channel: cam.Channel }, selectedSubGroup);
          
        await this.updateRecordScheduleByDevice(cam);

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
        
        let deletedScheduleStream = [];
        for(let stream of schedules){
          let find = currentCamera.Config.Stream.find(x=>x.Id == stream.StreamId)
          if(!find) deletedScheduleStream.push(stream);      
        }
        
        await Parse.Object.destroyAll(deletedScheduleStream);
    }

    async getGroupList():Promise<Group[]>{
        return await parseService.fetchData({
            type: Group
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
            //let it go without awaited .. yay...!
            this.deleteCamAsync(objectIds, nvrObjectId, groupList);
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
    private async deleteCamAsync(objectIds:string[], nvrObjectId: any, groupList: Group[]) {
        try{
            this.busy = true;
            for (let objectId of objectIds) {
                let cam = await parseService.getDataById({ type: Device, objectId });
                await this.deleteCam(cam, nvrObjectId);                
                await this.deleteCamRelatedData(cam, groupList);
                this.deviceCount--;
            }
          }
          catch(err){
            console.error(err);            
          }
          finally{
            this.busy = false;
            this.deviceCount = await this.getDeviceCount(); 
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
      findDeviceGroup(groupConfigs: Group[], channelData: IGroupChannel): string {        
        
        const tempGroup = groupConfigs.find(x => x.Level === '1' && x.Channel
            && x.Channel.some(ch => ch.Nvr === channelData.Nvr && ch.Channel === channelData.Channel));    
        
        return tempGroup ? tempGroup.id : '';
    }
    
  
  
    async cloneCam(cam:Device, quantity:number, nvrObjectId:string, groupList:Group[], account:string, password:string){
      try{
        this.busy = true;
        let selectedSubGroup = this.findDeviceGroup(groupList, { Nvr: cam.NvrId, Channel: cam.Channel });        
        let cloneResult = [];   
        let newChannels = await this.getNewChannelArray(cam.NvrId, quantity);
        for (let i = 0; i < quantity; i++) {
            coreService.addNotifyData({path: coreService.urls.URL_CLASS_NVR, objectId: nvrObjectId });

            let obj = this.cloneNewDevice({ cam, newChannel: newChannels[i] }, account, password);
            await obj.save().then(result => {            
                cloneResult.push(result);
                coreService.addNotifyData({path: coreService.urls.URL_CLASS_DEVICE, objectId: result.id});            
            }); 
            if(selectedSubGroup){
                await this.setChannelGroup(groupList, { Nvr: obj.NvrId, Channel: obj.Channel }, selectedSubGroup);
            }
            coreService.notify();
            this.deviceCount++;
        }            
      }
      catch(err){
        console.error(err);         
      }
      finally{
        this.busy = false;
        this.deviceCount = await this.getDeviceCount();
      }
      
    }
    

    async deleteCam(cam:Device, nvrObjectId:string){
        
        let result = await cam.destroy();
                     
        coreService.addNotifyData({
            path: coreService.urls.URL_CLASS_NVR,
            objectId: nvrObjectId
        });

        coreService.notifyWithParseResult({
            path: coreService.urls.URL_CLASS_DEVICE,
            parseResult:[result]
        });
          
    }
    async deleteCamRelatedData(cam :Device, groupList: Group[]){  
        // 刪除與此Camera相關的RecordSchedule
        let schedules = await parseService.fetchData({
          type: RecordSchedule,
          filter: query => query
            .equalTo('NvrId', cam.NvrId)
            .equalTo('ChannelId', cam.Channel)
        });

        let scheduleNotifications = await Parse.Object.destroyAll(schedules);
        coreService.addNotifyData({ path: coreService.urls.URL_CLASS_RECORDSCHEDULE, dataArr: scheduleNotifications });
  
        // 刪除與此Camera相關的EventHandler
        let handlers = await parseService.fetchData({
          type: EventHandler,
          filter: query => query
            .equalTo('NvrId',  cam.NvrId)
            .equalTo('DeviceId', cam.Channel)
        });

        let eventNotifications = await Parse.Object.destroyAll(handlers);
        coreService.notifyWithParseResult({ parseResult: eventNotifications, path: coreService.urls.URL_CLASS_EVENTHANDLER });
  
        await this.setChannelGroup( groupList, { Nvr: cam.NvrId, Channel: cam.Channel }, undefined);

        coreService.notify();
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

        groupConfigs.forEach(group => {
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
        });
        for(let group of saveList){
            await group.save().then(result=>{
                //console.log("result",result);
                coreService.addNotifyData({objectId:result.id, path: coreService.urls.URL_CLASS_GROUP })
            });
        }        
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
}


