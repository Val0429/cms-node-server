import { Injectable } from '@angular/core';
import { CoreService } from './core.service';
import { ParseService } from './parse.service';
import { CryptoService } from './crypto.service';
import { Nvr, Group, ServerInfo, Device } from 'app/model/core';
import { RequestOptions, Http } from '@angular/http';
import { UserService } from './user.service';
import { RestFulService } from './restful.service';
import ArrayHelper from 'app/helper/array.helper';
import { IDeviceStream } from 'lib/domain/core';
import JsonHelper from 'app/helper/json.helper';



  
@Injectable()
export class NvrService {
  async getNvrById(nvrId:string):Promise<Nvr>{
    let results = await this.parseService.fetchData({type:Nvr, filter:query=>query.equalTo("Id", nvrId).limit(1)});
    return results.length>0 ? results[0] : undefined;
  }
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
  async saveNvr(nvrs:Nvr[], group:string, getIdFirst:boolean=false):Promise<any[]>{      
     if(getIdFirst){
       let ids = await this.getNewNvrId(nvrs.length);
       for(let i=0;i<nvrs.length;i++){
         nvrs[i].Id=ids[i].toString();
         nvrs[i].SequenceNumber=ids[i];
       }
     }
      let result = await this.httpService.post(this.parseService.parseServerUrl + "/cms/nvr", { nvrs, newGroupId:group, auth:this.auth},
      new RequestOptions({ headers:this.coreService.parseHeaders})).toPromise();
      return result.json();   
  }
  async getNewNvrId(count:number):Promise<number[]>{
    let result = await this.httpService.get(this.parseService.parseServerUrl + `/cms/nvr/newId/${count}`,
      new RequestOptions({ headers:this.coreService.parseHeaders})).toPromise();
      return result.json(); 
  }
  async getNvrList(page:number, pageSize:number){
    let skip=(page-1)*pageSize;
    return await this.parseService.fetchData({
      type: Nvr,
      filter: query => query
        .ascending("SequenceNumber")
        .skip(skip>-1?skip:0)
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
  /** 轉發CGI取得該NVR的Device */
  async getNvrDevice(nvrId:string){
    
      let result = await this.coreService.proxyMediaServer({
        method: 'GET',
        path: `${this.coreService.urls.URL_MEDIA_GET_DEVICE_LIST}&nvr=nvr${nvrId}`,
        body: {}
      }, 30000).toPromise();        

      const deviceConnect = JsonHelper.instance.findAttributeByString(result, 'AllDevices.DeviceConnectorConfiguration');
      return this.convertTempToDisplay(deviceConnect, nvrId);
  }
    /** 將media server來的tempDevice轉為CMS儲存格式 */
  convertTempToDisplay(arr: any, nvrId:string): Device[] {
    if (!arr) {
      return [];
    }

    const tempList: Device[] = [];
    const processList = ArrayHelper.toArray(arr);

    processList.forEach(dev => {
      try {
        this.convertTempDeviceFormat(dev);
        const newObj = new Device({
          NvrId: nvrId,
          Name: dev.DeviceSetting.Name,
          Channel: Number(dev.DeviceID),
          Config: dev.DeviceSetting,
          Capability: dev.Capability
        });

        newObj.Config.Stream.forEach(str => {
          str.Id = Number(str.Id);
        });
        tempList.push(newObj);
      } catch (err) {
        return;
      }
    });

    return tempList;
  }
  /** 從MediaServer取得tempDevice後，由於與儲存格式名稱不同，需先轉換方便後續作業 */
  convertTempDeviceFormat(dev: any) {
    dev.DeviceSetting.Stream = this.convertStreamConfig(dev.DeviceSetting.StreamConfig);
    delete dev.DeviceSetting.StreamConfig;
    dev.DeviceSetting['Multi-Stream'] = this.convertMultiStream(dev.DeviceSetting['Multi-Stream']);
  }
  /** 將MediaServer上的Stream資料格式轉換為CMS儲存格式 */
  convertStreamConfig(stream: any) {
    const results = [];
    if (!stream) {
      return results;
    }
    stream = ArrayHelper.toArray(stream);

    stream.forEach(str => {
      const newItem: IDeviceStream = {
        Id: Number(str.$.id),
        Video: str.Video,
        Port: {}
      };
      results.push(newItem);
    });
    return results;
  }



  /** 將MediaServer上的MultiStream資料格式轉換為CMS儲存格式 */
  convertMultiStream(multiStream: any) {
    return {
      High: multiStream ? multiStream.HighProfile : undefined,
      Medium: multiStream ? multiStream.MediumProfile : undefined,
      Low: multiStream ? multiStream.LowProfile : undefined
    };
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