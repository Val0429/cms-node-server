
import { Request, Response } from 'express';
import { Nvr, Device, Group, EventHandler, RecordSchedule } from '../domain';
import { ParseHelper, ServerHelper } from '../helpers';
import { Observable } from 'rxjs';
import { CoreService } from './core.service';
import { IGroupChannel } from 'lib/domain/core';

const parseHelper = ParseHelper.instance;
const coreService = CoreService.instance;

export class DeviceService {

    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: DeviceService;

    constructor() {
        
    }
    async post(req:Request, res:Response){
        try{
            coreService.auth = req.body.auth;     
            let nvrObjectId = req.body.nvrObjectId;
            let cam = req.body.cam;
            let quantity = req.body.quantity;
            let account = req.body.account;
            let password = req.body.password;
            
            if(!nvrObjectId){
                let nvr = await this.getDefaultNvr();
                nvrObjectId = nvr.id;
            }
            
            let groupList = await this.getGroupList();
            
            await this.cloneCam(cam, quantity, nvrObjectId, groupList, account, password);
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
    }
    get(req:Request, res:Response){
        parseHelper.fetchData({
            type: Device,
        }).then(devices => {
            res.json(devices);
        })
    }
    async getDefaultNvr():Promise<Nvr>{
        return Observable.fromPromise(parseHelper.getData({
            type: Nvr,
            filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
          })).toPromise();
    }
    async getGroupList():Promise<Group[]>{
        return await Observable.fromPromise(parseHelper.fetchData({
            type: Group
          })).toPromise();
    }
    async delete(req:Request, res:Response){
        try{
            coreService.auth = req.body.auth;            
            let nvrObjectId = req.body.nvrObjectId;
            if(!nvrObjectId){
                let nvr = await this.getDefaultNvr();
                nvrObjectId = nvr.id;
            }
            
            let groupList = await this.getGroupList();
            
            for(let objectId of req.body.objectIds){
                let cam = await parseHelper.getDataById({type:Device, objectId}); 
                await this.deleteCam(cam, nvrObjectId);
                //let it go without awaited .. yay...!
                this.deleteCamRelatedData(cam, groupList);
            }
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
      
      let selectedSubGroup = this.findDeviceGroup(groupList, { Nvr: cam.NvrId, Channel: cam.Channel });
      let cameraConfigs = await Observable.fromPromise(parseHelper.fetchData({ type:Device})).toPromise();
      let cloneResult = [];            
      
      
      for (let i = 0; i < quantity; i++) {
        coreService.addNotifyData({path: coreService.urls.URL_CLASS_NVR, objectId: nvrObjectId });

        let obj = this.cloneNewDevice({ cam, newChannel: this.getNewChannelId(cameraConfigs, cloneResult) }, account, password);                           
        await Observable.fromPromise(obj.save()).toPromise().then(result => {            
            cloneResult.push(result);
            coreService.addNotifyData({path: coreService.urls.URL_CLASS_DEVICE, objectId: result.id});            
        }); 
        await this.setChannelGroup(groupList, { Nvr: obj.NvrId, Channel: obj.Channel }, selectedSubGroup);
        coreService.notify();
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
        const removeRecordSchedule$ = Observable.fromPromise(parseHelper.fetchData({
          type: RecordSchedule,
          filter: query => query
            .equalTo('NvrId', cam.NvrId)
            .equalTo('ChannelId', cam.Channel)
        }))
          .switchMap(schedules => Observable.fromPromise(Parse.Object.destroyAll(schedules)))
          .map(results => coreService.addNotifyData({ path: coreService.urls.URL_CLASS_RECORDSCHEDULE, dataArr: results }));
  
        // 刪除與此Camera相關的EventHandler
        const removeEventHandler$ = Observable.fromPromise(parseHelper.fetchData({
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
                console.log("result",result);
                coreService.addNotifyData({objectId:result.id, path: coreService.urls.URL_CLASS_GROUP })
            })).toPromise();
        }        
    }
}


