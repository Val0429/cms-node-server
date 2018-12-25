
import { Request, Response } from 'express';
import { Nvr, Device, Group, EventHandler, RecordSchedule } from '../domain';
import { ParseHelper, ServerHelper, ParseServerHelper } from '../helpers';
import { Observable } from 'rxjs';
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
    async getDeviceStatus(req:Request, res:Response){
        //let deviceCount = await this.getDeviceCount();
        res.json({busy:this.busy, deviceCount:this.deviceCount});
    }
    async post(req:Request, res:Response){
        try{
            if(this.busy===true){
                res.status(429);
                res.json({message:"server is busy"});
                return;
            }
            coreService.auth = req.body.auth;     
            let { nvrObjectId, cam, quantity, account, password } = req.body;         
            
            let availableLicense = await this.getLicenseAvailableCount("00171").toPromise();
            if(availableLicense < quantity){
                throw new Error("Not enough license");
            }

            if(!nvrObjectId){
                let nvr = await this.getDefaultNvr();
                nvrObjectId = nvr.id;
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
    private async getDeviceCount():Promise<number>{
        return await Observable.fromPromise(parseService
            .countFetch({type:Device, 
                filter:query=>query
                .limit(Number.MAX_SAFE_INTEGER)}))
            .toPromise();
    }
    get(req:Request, res:Response){
        parseService.fetchData({
            type: Device,
        }).then(devices => {
            res.json(devices);
        })
    }
    async getNewChannel(req:Request, res:Response){
        let nvrId = req.params["nvrId"];
        if(!nvrId){
            let nvr = await Observable.fromPromise(parseService.getData({
                type: Nvr,
                filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
              })).toPromise();

            nvrId = nvr.Id;
        }
        let data = await this.getAllDevice(nvrId);        
        let newChannelId = this.getNewChannelId(data);
        res.json({newChannelId});
    }
    private async getAllDevice(nvrId:string) {
        return await Observable.fromPromise(parseService.fetchData({
            type: Device,
            filter: query =>                 
                query
                .equalTo('NvrId', nvrId)
                .ascending("Channel")
                .limit(Number.MAX_SAFE_INTEGER)
                
        })).toPromise();
    }

    async getDefaultNvr():Promise<Nvr>{
        return Observable.fromPromise(parseService.getData({
            type: Nvr,
            filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
          })).toPromise();
    }
    async getGroupList():Promise<Group[]>{
        return await Observable.fromPromise(parseService.fetchData({
            type: Group
          })).toPromise();
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
    
    getNewChannelId(cameraConfigs:Device[], tempChannel?: Device[]): number {
        const list = cameraConfigs.concat(tempChannel || []);
        list.sort(function (a, b) {
          return (a.Channel > b.Channel) ? 1 : ((b.Channel > a.Channel) ? -1 : 0);
        });
        let channel = 0;
        let found:boolean = true;
        let listArray = list.map(function(e){return e.Channel});
        // find empty channel
        while(found) {
          found = listArray.indexOf(++channel) > -1;
        }
        return channel;
        
      }
    async cloneCam(cam:Device, quantity:number, nvrObjectId:string, groupList:Group[], account:string, password:string){
      try{
        this.busy = true;
        let selectedSubGroup = this.findDeviceGroup(groupList, { Nvr: cam.NvrId, Channel: cam.Channel });
        let cameraConfigs = await this.getAllDevice(cam.NvrId);
        let cloneResult = [];   
        
        for (let i = 0; i < quantity; i++) {
            coreService.addNotifyData({path: coreService.urls.URL_CLASS_NVR, objectId: nvrObjectId });

            let obj = this.cloneNewDevice({ cam, newChannel: this.getNewChannelId(cameraConfigs, cloneResult) }, account, password);                           
            await Observable.fromPromise(obj.save()).toPromise().then(result => {            
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
        
        const delete$ = Observable.fromPromise(cam.destroy())
          .map(result => {            
            coreService.addNotifyData({
              path: coreService.urls.URL_CLASS_NVR,
              objectId: nvrObjectId
            });
            coreService.notifyWithParseResult({
              path: coreService.urls.URL_CLASS_DEVICE,
              parseResult:[result]
            });
          });
          await delete$.toPromise();
    }
    async deleteCamRelatedData(cam :Device, groupList: Group[]){  
        // 刪除與此Camera相關的RecordSchedule
        const removeRecordSchedule$ = Observable.fromPromise(parseService.fetchData({
          type: RecordSchedule,
          filter: query => query
            .equalTo('NvrId', cam.NvrId)
            .equalTo('ChannelId', cam.Channel)
        }))
          .switchMap(schedules => Observable.fromPromise(Parse.Object.destroyAll(schedules)))
          .map(results => coreService.addNotifyData({ path: coreService.urls.URL_CLASS_RECORDSCHEDULE, dataArr: results }));
  
        // 刪除與此Camera相關的EventHandler
        const removeEventHandler$ = Observable.fromPromise(parseService.fetchData({
          type: EventHandler,
          filter: query => query
            .equalTo('NvrId',  cam.NvrId)
            .equalTo('DeviceId', cam.Channel)
        }))
          .switchMap(handler => Observable.fromPromise(Parse.Object.destroyAll(handler)))
          .map(results => coreService.notifyWithParseResult({
            parseResult: results, path: coreService.urls.URL_CLASS_EVENTHANDLER
          }));
  
        return await removeRecordSchedule$
          .switchMap(() => removeEventHandler$)  
          .switchMap(async () =>  await this.setChannelGroup( groupList, { Nvr: cam.NvrId, Channel: cam.Channel }, undefined))
          .map(()=> coreService.notify())
          .toPromise();
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
            await Observable.fromPromise(group.save().then(result=>{
                //console.log("result",result);
                coreService.addNotifyData({objectId:result.id, path: coreService.urls.URL_CLASS_GROUP })
            })).toPromise();
        }        
    }


    /** 取得目前所有的License並計算未過期的數量
     * 格式: key: ProductNo, value: 數量
     */
    getLicenseLimit() {
        this.licenseLimit = {["00171"]:0};
        
        return coreService.proxyMediaServer({
            method: 'GET',
            path: coreService.urls.URL_MEDIA_LICENSE_INFO
        },2000).map(result => {            
            
            if(!result || !result.License) return;

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
        });
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
    getLicenseAvailableCount(lic: string) {
        if (!lic) {
            alert('No available license type.');
            return Observable.of(0);
        }
        if (lic === 'pass') {
            return Observable.of(10000);
        }
        const get$ = this.getLicenseUsageIPCamera()
            .map(num => this.licenseLimit[lic] - num);
        return this.getLicenseLimit()
            .switchMap(() => get$);
    }
    getLicenseUsageIPCamera() {
        const getNvr$ = Observable.fromPromise(parseService.getData({
            type: Nvr,
            filter: query => query.equalTo('Driver', 'IPCamera')
        }));

        const getDevice$ = (nvrId: string) => Observable.fromPromise(parseService.countFetch({
            type: Device,
            filter: query => query.equalTo('NvrId', nvrId).limit(30000)
        }));

        return getNvr$
            .switchMap(nvr => getDevice$(nvr.Id));
    }
}


