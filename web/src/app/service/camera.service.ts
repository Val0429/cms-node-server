import { Injectable } from '@angular/core';
import { CoreService } from './core.service';
import { IDeviceVendor, DeviceVendor } from '../config/device-vendor.config';
import { CameraEditorParam } from '../model/camera-editor-param';
import { ArrayHelper } from '../helper/array.helper';
import { Nvr, Device, RecordSchedule, EventHandler, Group } from 'app/model/core';
import { Observable } from 'rxjs';
import { ParseService } from './parse.service';
import { GroupService } from './group.service';
import { CryptoService } from './crypto.service';
import StringHelper from 'app/helper/string.helper';
import { ISearchCamera } from 'lib/domain/core';
import { Http, RequestOptions } from '@angular/http';
import { UserService } from './user.service';

@Injectable()
export class CameraService {
    currentBrandCapability: any; // 從server取回的json格式capability

    constructor(
        private httpService:Http,
        private coreService: CoreService, 
        private parseService:ParseService, 
        private groupService:GroupService,
        private cryptoService:CryptoService,
        private userService:UserService
        ) { }

    brandList = DeviceVendor; // 固定list
        
    getBrandDisplay(key:string):string{
        let brand = this.brandList.find(x=>x.Key.toLowerCase() == (key || "").toLowerCase());
        return brand ? brand.Name : key;
    }
    /** 取得Model Capability */
    getCapability(currentCamera:Device, brand: string,  modelList: string[]):Observable<any> {
        console.debug("brand", brand);
        
        const vendor = this.brandList.find(x => x.Key === brand);
        console.debug("this.brandList", this.brandList);
        console.debug("vendor", vendor);
        console.debug("currentCamera", currentCamera);
        
        const data = {
        fileName: vendor.FileName
        };
        return this.coreService.postConfig({ path: this.coreService.urls.URL_BRAND_CAPABILITY, data: data })
        .map(result => {
                console.debug("this.currentBrandCapability", result);
                this.currentBrandCapability = result;
                
                for(let model of this.getModelList()){
                    modelList.push(model);
                }
                
                // If no value or not on list, set value to first option
                if (StringHelper.isNullOrEmpty(currentCamera.Config.Model)
                || modelList.indexOf(currentCamera.Config.Model) < 0) {
                    currentCamera.Config.Model = modelList[0];
                }  
            });
    }
    
    /** 建立新Device */
    getNewDevice(args: { nvrId: string, searchCamera: ISearchCamera, channel: number }) {
    const obj = new Device();
    obj.NvrId = args.nvrId;
    obj.Name = args.searchCamera && args.searchCamera.HOSTNAME ? args.searchCamera.HOSTNAME : `New Camera ${args.channel}`;
    obj.Channel = args.channel;
    obj.Config = {
      Brand: args.searchCamera ? args.searchCamera.COMPANY : '',
      Model: args.searchCamera ? args.searchCamera.PRODUCTIONID : '',
      Name: args.searchCamera ? args.searchCamera.HOSTNAME : '',
      IPAddress: args.searchCamera ? args.searchCamera.WANIP : '',
      Http: args.searchCamera ? Number(args.searchCamera.HTTPPORT) : 80,
      Authentication: {
        Account: 'admin',
        Password: '123456',
        Encryption: 'BASIC',
        OccupancyPriority: 0
      },
      PTZSupport: {
        Pan: 'false',
        Tilt: 'false',
        Zoom: 'false'
      },
      'Multi-Stream': {
        High: 1,
        Medium: 1,
        Low: 1
      },
      Stream: []
    };
    obj.Capability = {
      NumberOfAudioIn: 0,
      NumberOfAudioOut: 0,
      NumberOfMotion: 0,
      NumberOfChannel: 0,
      NumberOfDi: 0,
      NumberOfDo: 0,
      FocusSupport: 'false',
      Type: ''
    };
    obj.CameraSetting = {
      AspectRatioCorrection: false,
      Mode: 0,
      TVStandard: '',
      LiveStream: 1,
      RecordStream: 1,
      SensorMode: '',
      PowerFrequency: 0,
      DewarpType: 'Off',
      MountType: '',
      SeamlessEdgeRecording: 'false',
      IOPort: []
    };
    return obj;
  }
  async getDevice(nvrId:string, page:number, pageSize:number):Promise<Device[]>{
    // REST server performance is too slow, will fix it later
    // let options=new RequestOptions({ headers:this.coreService.parseHeaders});
    // let response = await this.httpService.get(this.parseService.parseServerUrl + `/cms/device?nvrId=${nvrId}&page=${page}&pageSize=${pageSize}`, options ).toPromise();
    // return response.json();

    let devices = await this.parseService.fetchData({
      type: Device,
      filter: query=>query
          .equalTo("NvrId", nvrId)
          .ascending('Channel')
          .limit(pageSize)
          .skip((page-1)*pageSize)
    });
    return devices;
  }
  async saveCamera(currentCamera:Device, ipCameraNvr:Nvr, selectedSubGroup:string, editorParam: CameraEditorParam, tags:string):Promise<Device>{

    currentCamera.Name = this.coreService.stripScript(currentCamera.Name);
    currentCamera.Tags = tags.split(',');
    // this.currentCamera.Tags = this.tags.replace(/ /g, '').split(',');
    if(editorParam){
        editorParam.getStreamSaveNumberBeforeSave();
        editorParam.getResolutionBeforeSave();
        editorParam.removeAttributesBeforeSave();
    }
    console.debug("this.currentCamera.Config", currentCamera.Config);
    // 加密
    currentCamera.Config.Authentication.Account = this.cryptoService.encrypt4DB(currentCamera.Config.Authentication.Account);
    currentCamera.Config.Authentication.Password = this.cryptoService.encrypt4DB(currentCamera.Config.Authentication.Password);
    
    // 將RTSPURI組合完整
    if (currentCamera.Config.Brand === 'Customization') {
      currentCamera.Config.Stream.forEach(str => {
        str.RTSPURI = `rtsp://${currentCamera.Config.IPAddress}:${str.Port.RTSP}${str.RTSPURI.indexOf('/') < 0 ? "/" : ""}${str.RTSPURI || ''}`;
      });
    }
    console.debug("this.currentCamera", currentCamera);

    let auth=this.auth;

    let body = { 
      cam : currentCamera, 
      selectedSubGroup,      
      auth, 
      nvrObjectId:ipCameraNvr.id,
      nvrId:ipCameraNvr.Id
    };
    let options=new RequestOptions({ headers:this.coreService.parseHeaders});
    
    let result = await this.httpService.post(this.parseService.parseServerUrl + "/cms/device", body, options).toPromise();
    return result.json();

  }
 async getNewChannelId(count?:number, nvrId?:string):Promise<number[]>{
    let response = await this.httpService.get(this.parseService.parseServerUrl + `/cms/device/channel/${count}/${nvrId}`, 
    new RequestOptions({ headers:this.coreService.parseHeaders})).toPromise();
    let result = response.json();
    console.debug("result", result);
    return result;
 }
 async getDeviceCount(nvrId:string):Promise<number>{
  // REST server performance is too slow, will fix it later
  // let response = await this.httpService.get(this.parseService.parseServerUrl + `/cms/device/count/${nvrId}`, 
  // new RequestOptions({ headers:this.coreService.parseHeaders})).toPromise();
  // let result = response.json();
  // return result.count

  let result = await this.parseService.countFetch({type:Device, filter:query=>query.equalTo("NvrId", nvrId)});  
  return result;
}
 async getStatus(): Promise<any>{
  let result = await this.httpService.get(this.parseService.parseServerUrl + "/cms/device/status", 
    new RequestOptions({ headers:this.coreService.parseHeaders})).toPromise();
    return result.json();
}
    async deleteCam(camIds : string[], nvrObjectId:string): Promise<any>{
      let result = await this.httpService.delete(this.parseService.parseServerUrl + "/cms/device", 
        new RequestOptions({ headers:this.coreService.parseHeaders, body:{ objectIds: camIds, auth:this.auth, nvrObjectId}})).toPromise();
        return result.json();
    }
    get auth():string{
      return btoa(`${this.userService.storage['username']}:${this.userService.storage['password']}`);       
    }
    async cloneCam(cam:Device, quantity:Number, ipCameraNvr:Nvr): Promise<any>{            
      let account = this.cryptoService.encrypt4DB(cam.Config.Authentication.Account);
      let password = this.cryptoService.encrypt4DB(cam.Config.Authentication.Password);
      let auth=this.auth;

      let body = { cam, 
        quantity, 
        auth, 
        nvrObjectId:ipCameraNvr.id, 
        account,
        password
      };
      let options=new RequestOptions({ headers:this.coreService.parseHeaders});
      console.debug("options", options);
      let result = await this.httpService.post(this.parseService.parseServerUrl + "/cms/device/clone", body, options).toPromise();
      return result.json();
    }
       
    /** 取得當前Brand底下所有Model型號 */
    getModelList(): string[] {
        const result = [];
        if (!this.currentBrandCapability) {
            return result;
        } else {
            if (Array.isArray(this.currentBrandCapability.Devices.Device)) {
                this.currentBrandCapability.Devices.Device.forEach(element => {
                    result.push(element.Model);
                });
                ArrayHelper.sortString(result);
            } else {
                result.push(this.currentBrandCapability.Devices.Device.Model);
            }
            return result;
        }
    }

    /** 讀取指定model轉為CameraEditorParam物件 */
    getCameraEditorParam(model: string, data: Device):any {
        console.debug("currentBrandCapability", this.currentBrandCapability, model, data);
        if (!this.currentBrandCapability) {
            return undefined;
        }
        return new CameraEditorParam(this.currentBrandCapability, model, data);
    }
}
