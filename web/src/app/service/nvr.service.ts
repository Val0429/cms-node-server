import { Injectable } from '@angular/core';
import { CoreService } from './core.service';
import { ParseService } from './parse.service';
import { CryptoService } from './crypto.service';
import { Nvr, Group, ServerInfo } from 'app/model/core';
import { RequestOptions, Http } from '@angular/http';
import { UserService } from './user.service';
import { RestFulService } from './restful.service';



  
@Injectable()
export class NvrService {
  get auth():string{
    return btoa(`${this.userService.storage['username']}:${this.userService.storage['password']}`);       
  }
    constructor(
        private coreService: CoreService, 
        private parseService:ParseService,         
        private cryptoService:CryptoService,
        private httpService:Http,
        private userService:UserService,
        private restFulService:RestFulService
        ) { }
  async saveNvr(nvrs:Nvr[], group:string):Promise<any[]>{      
      let result = await this.httpService.post(this.parseService.parseServerUrl + "/cms/nvr", { nvrs, newGroupId:group, auth:this.auth},
      new RequestOptions({ headers:this.coreService.parseHeaders})).toPromise();
      return result.json();   
  }
  async getNvrList(page:number, pageSize:number){
    
    return await this.parseService.fetchData({
      type: Nvr,
      filter: query => query
        .ascending("SequenceNumber")
        .skip((page-1)*pageSize)
        .limit(pageSize)
    });
  }
  async getNvrCount(){
    return await this.restFulService.getCount({type:Nvr, filter:query=>query.limit(Number.MAX_SAFE_INTEGER)});
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
    editNvr.Tags = currentEditModel.Tags.split(',');
  }
/** 將editNvr內容套用至編輯Model */
setEditModel(editNvr:Nvr, groupList:Group[], iSapP2PServerList:ServerInfo[], newGroupId?:string) {
  // iSapP2P專用屬性
  console.debug("iSapP2PServerList", iSapP2PServerList);
  const serverInfo = iSapP2PServerList.find(data =>
    data.Domain === editNvr.Domain && data.Port === editNvr.Port);

  // 獨立屬性Group
  const group = groupList.find(data => data.Nvr && data.Nvr.indexOf(editNvr.Id) >= 0);
  //if no group found set to "Non Sub Group" group #for version 3.00.25 and above
  console.debug("group1", group);
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
    Group: newGroupId || (group ? group.id : groupList.find(x=>x.Name == "Non Sub Group").id),
    ServerId: serverInfo ? serverInfo.id : undefined
  };
  console.debug("group2", currentEditModel.Group);
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
  
  async deleteNvr(nvrIds:string[]):Promise<any> {
    let result = await this.httpService.delete(this.parseService.parseServerUrl + "/cms/nvr", 
    new RequestOptions({ headers:this.coreService.parseHeaders, body:{ objectIds: nvrIds, auth:this.auth}})).toPromise();
    return result.json();        
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