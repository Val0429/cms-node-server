import { Injectable } from '@angular/core';
import { CoreService } from './core.service';
import { ParseService } from './parse.service';
import { GroupService } from './group.service';
import { CryptoService } from './crypto.service';
import { Observable } from 'rxjs';
import { Nvr, RecordSchedule, EventHandler, Device, Group, ServerInfo } from 'app/model/core';



  
@Injectable()
export class NvrService {
  
    constructor(
        private coreService: CoreService, 
        private parseService:ParseService, 
        private groupService:GroupService,
        private cryptoService:CryptoService
        ) { }
        saveNvr(editNvr:Nvr, currentEditModel:INvrEditModel):Observable<void> {
    
          editNvr.Tags = currentEditModel.Tags.split(',');
          this.getEditModel(editNvr, currentEditModel);
      
          const setId$ = this.getNewNvrId(editNvr)
            .map(newId =>{ editNvr.Id = newId;
              if(!editNvr.Name)editNvr.Name=`New NVR ${newId}`;
            });
      
          return setId$
            .switchMap(() => Observable.fromPromise(editNvr.save())
              .map(result => this.coreService.notifyWithParseResult({
                parseResult: [result], path: this.coreService.urls.URL_CLASS_NVR
              })))
            .switchMap(() => {
              return currentEditModel.Group ? 
                this.groupService.setNvrGroup(editNvr.Id, currentEditModel.Group):
                this.groupService.removeNvr(editNvr.Id) 
            });
        }
         /** 依照Manufacture決定Driver value */
  getNvrDriverByManufacture(currentEditModel:INvrEditModel) {
    switch (currentEditModel.Manufacture.toLowerCase()) {
      case 'iSAP failover server': return 'iSAP';
      case 'milestone corporate 2016 r2': return 'MilestoneCorporate';
      case 'acti enterprise': return 'ACTi_E';
      case 'diviotec (linux)':
      case 'diviotec (windows)': return 'Diviotec';
      default: return currentEditModel.Manufacture;
    }
  }
  /** 將編輯Model內容套用至editNvr */
  getEditModel(editNvr:Nvr, currentEditModel:INvrEditModel) {
    editNvr.Name = this.coreService.stripScript(currentEditModel.Name || "");
    editNvr.Manufacture = currentEditModel.Manufacture;
    editNvr.Driver = this.getNvrDriverByManufacture(currentEditModel);
    editNvr.Domain = currentEditModel.Domain;
    editNvr.Port = currentEditModel.Port;
    editNvr.ServerPort = currentEditModel.ServerPort;
    editNvr.Account = this.cryptoService.encrypt4DB(currentEditModel.Account);
    editNvr.Password = this.cryptoService.encrypt4DB(currentEditModel.Password);
    editNvr.IsListenEvent = currentEditModel.IsListenEvent;
    editNvr.IsPatrolInclude = currentEditModel.IsPatrolInclude;
    editNvr.SSLEnable = currentEditModel.SSLEnable;
  }
/** 將editNvr內容套用至編輯Model */
setEditModel(editNvr:Nvr, groupList:Group[], iSapP2PServerList:ServerInfo[]) {
  // iSapP2P專用屬性
  const serverInfo = iSapP2PServerList.find(data =>
    data.Domain === editNvr.Domain && data.Port === editNvr.Port);

  // 獨立屬性Group
  const group = groupList.find(data => data.Nvr && data.Nvr.indexOf(editNvr.Id) >= 0);
  //if no group found set to "No Group" group #for version 3.00.25 and above

  let currentEditModel : INvrEditModel = {
    Name: editNvr.Name,
    Manufacture: editNvr.Manufacture || editNvr.Driver,
    Domain: editNvr.Domain,
    Port: editNvr.Port,
    ServerPort: editNvr.ServerPort,
    Account: this.cryptoService.decrypt4DB(editNvr.Account || "zQjDgOyQcPU="),
    Password: this.cryptoService.decrypt4DB(editNvr.Password || "JRp9eL+fp18="),
    Tags: editNvr.Tags ? editNvr.Tags.join(',') : '',
    IsListenEvent: editNvr.IsListenEvent,
    IsPatrolInclude: editNvr.IsPatrolInclude,
    SSLEnable: editNvr.SSLEnable,
    Group: group ? group.id : groupList.find(x=>x.Name == "No Group").id,
    ServerId: serverInfo ? serverInfo.id : undefined
  };

  return currentEditModel;
}
        /** 建立新Nvr物件 */
        createNVRObject(nvr?: any): Nvr {
          const newObj = new Nvr({
            Name: nvr ? nvr.$.DeviceName : `New NVR`,
            Driver: nvr ? nvr.$.Driver : 'iSAP',
            Manufacture: nvr ? nvr.$.Driver : 'iSAP',
            Domain: nvr ? nvr.$.IP : '',
            Port: nvr ? Number(nvr.$.Port) : 80,
            ServerPort: 0,
            ServerStatusCheckInterval: 600,
            Account: '',
            Password: '',
            SSLEnable: false,
            IsListenEvent: true,
            IsPatrolInclude: true,
            BandwidthBitrate: 0,
            BandwidthStream: 1
          });
          return newObj;
        }
        /** 取得所有Nvr並找出適當NvrId */
  getNewNvrId(nvr:Nvr) {
    if (nvr.Id) {
      return Observable.of(nvr.Id);
    }
    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query
        .select('Id')
        .limit(30000)
    })).map(nvrs => {
      nvrs.sort(function (a, b) {
        return (Number(a.Id) > Number(b.Id)) ? 1 : ((Number(b.Id) > Number(a.Id)) ? -1 : 0);
      });
      let result = 1;
      nvrs.forEach(nvr => {
        if (result === Number(nvr.Id)) {
          result++;
        } else {
          return;
        }
      });
      return result.toString();
    });
    return get$;
  }
        async deleteNvr(nvr:Nvr):Promise<void> {
          console.debug("delete nvr", nvr);
    
          const deleteSchedule$ = Observable.fromPromise(this.parseService.fetchData({
            type: RecordSchedule,
            filter: query => query.equalTo('NvrId', nvr.Id)
          }))
            .switchMap(data => Observable.fromPromise(Parse.Object.destroyAll(data)))
            .map(result => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_RECORDSCHEDULE, dataArr: result }));
    
          const deleteEventHandler$ = Observable.fromPromise(this.parseService.fetchData({
            type: EventHandler,
            filter: query => query.equalTo('NvrId', nvr.Id)
          }))
            .switchMap(data => Observable.fromPromise(Parse.Object.destroyAll(data)))
            .map(result => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_EVENTHANDLER, dataArr: result }));
    
            
           const deleteDvices = this.parseService.fetchData({
              type: Device,
              filter: query => query
                .equalTo('NvrId', nvr.Id)
                .ascending('Channel')
                .limit(30000)
            }).then(devices => {
              console.debug("selectedDevices", devices);
              Observable.fromPromise(Parse.Object.destroyAll(devices)).map(result => {
                console.debug("delete result", result);
                this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_DEVICE, dataArr: result })
              }).toPromise();
            });
              
    
          const deleteNvr$ = Observable.fromPromise(nvr.destroy())
            .map(result => this.coreService.notifyWithParseResult({
              parseResult: [result], path: this.coreService.urls.URL_CLASS_NVR
            }));
    
          const deleteGroupNvr$ = this.groupService.removeNvr(nvr.Id);
    
          return deleteSchedule$
            .switchMap(() => deleteEventHandler$)
            .switchMap(() => deleteDvices)    
            .switchMap(() => deleteNvr$)
            .switchMap(() => deleteGroupNvr$)        
            .toPromise()
            
      }
    
}

export interface INvrEditModel {
  Name: string;
  Manufacture: string;
  Domain: string;
  Port: number;
  ServerPort: number;
  Account: string;
  Password: string;
  Tags: string;
  IsListenEvent: boolean;
  IsPatrolInclude: boolean;
  SSLEnable: boolean;
  /** NVR所屬Group, 不屬於Nvr增儲存資料, 需另外處理 */
  Group?: string;
  /** iSapP2P專用: 選擇ServerInfo中type=SmartMedia的資料 */
  ServerId?: string;
}