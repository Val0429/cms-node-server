
import { Request, Response } from 'express';
import { Nvr, Device, Group, EventHandler, RecordSchedule } from '../domain';
import { ParseHelper } from '../helpers';
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
    get(req:Request, res:Response){
        parseHelper.fetchData({
            type: Device,
        }).then(devices => {
            res.json(devices);
        })
    }
    async delete(req:Request, res:Response){
        try{
            coreService.auth = req.body.auth;            
            let nvrObjectId = req.body.nvrObjectId;
            let groupList = req.body.groupList;
            if(!nvrObjectId){
                await Observable.fromPromise(parseHelper.getData({
                    type: Nvr,
                    filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
                  })).do(nvr => nvrObjectId = nvr.id).toPromise();                  
            }
            if(!groupList){
                await Observable.fromPromise(parseHelper.fetchData({
                    type: Group
                  }).then(groups => {
                    groupList = groups;
                  })).toPromise();
            }

            
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
          .switchMap(() => this.setChannelGroup(
            groupList, { Nvr: cam.NvrId, Channel: cam.Channel }, undefined))               
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
    setChannelGroup(groupConfigs: Group[], newData: IGroupChannel, newGroupId: string) {
        const saveList = [];

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

        return Observable.fromPromise(Parse.Object.saveAll(saveList)
            .then(groups => coreService.notifyWithParseResult({ parseResult: groups, path: coreService.urls.URL_CLASS_GROUP })));
    }
}


