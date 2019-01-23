import { Injectable } from '@angular/core';
import { CoreService } from './core.service';
import { DeviceVendor } from '../config/device-vendor.config';
import { CameraEditorParam } from '../model/camera-editor-param';
import { ArrayHelper } from '../helper/array.helper';
import { Nvr, Device } from 'app/model/core';
import { ParseService } from './parse.service';
import { CryptoService } from './crypto.service';
import { ISearchCamera } from 'lib/domain/core';
import { Http, RequestOptions } from '@angular/http';
import { UserService } from './user.service';

@Injectable()
export class CameraService {
    

    constructor(
        private httpService:Http,
        private coreService: CoreService, 
        private parseService:ParseService, 
        private cryptoService:CryptoService,
        private userService:UserService
        ) { }

    brandList = DeviceVendor; // 固定list
        
    getBrandDisplay(key:string):string{
        let brand = this.brandList.find(x=>x.Key.toLowerCase() == (key || "").toLowerCase());
        return brand ? brand.Name : key;
    }
    /** 取得Model Capability */
    async getCapability(brand: string):Promise<any> {
        console.debug("brand", brand);
        
        const vendor = this.brandList.find(x => x.Key === brand);
        console.debug("this.brandList", this.brandList);
        console.debug("vendor", vendor);
        const data = {
        fileName: vendor.FileName
        };
        return await this.coreService.postConfig({ path: this.coreService.urls.URL_BRAND_CAPABILITY, data: data }).toPromise();        
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
  async saveCamera(cams:Device[], ipCameraNvr:Nvr, selectedSubGroup:string, tags:string):Promise<Device>{
    cams.forEach(currentCamera=>{
      currentCamera.Name = this.coreService.stripScript(currentCamera.Name);
      currentCamera.Tags = tags.split(',');    
      
      // 加密
      currentCamera.Config.Authentication.Account = this.cryptoService.encrypt4DB(currentCamera.Config.Authentication.Account);
      currentCamera.Config.Authentication.Password = this.cryptoService.encrypt4DB(currentCamera.Config.Authentication.Password);
      
      // 將RTSPURI組合完整
      if (currentCamera.Config.Brand === 'Customization') {
        currentCamera.Config.Stream.forEach(str => {
          str.RTSPURI = `rtsp://${currentCamera.Config.IPAddress}:${str.Port.RTSP || 80}${!str.RTSPURI || str.RTSPURI.indexOf('/') < 0 ? "/" : ""}${str.RTSPURI || ''}`;
        });
      }
      console.debug("this.currentCamera", currentCamera);
    });    

    let auth=this.auth;

    let body = { 
      cams, 
      selectedSubGroup,      
      auth, 
      nvrObjectId:ipCameraNvr.id,
      nvrId:ipCameraNvr.Id
    };
    let options=new RequestOptions({ headers:this.coreService.parseHeaders});
    
    let result = await this.httpService.post(this.parseService.parseServerUrl + "/cms/device", body, options).toPromise();
    return result.json();

  }
  async getDeviceCount(nvrId:string):Promise<number>{
    try{
      let response = await this.httpService.get(this.parseService.parseServerUrl + `/cms/device/count/${nvrId}`, 
      new RequestOptions({ headers:this.coreService.parseHeaders})).toPromise();
      let result = response.json();
      return result.count;
    }catch(err){
      console.log(err);
      return 0;
    }
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
    async getCameraPrimaryData(nvrId:string, channelId:number){
      let results = await this.parseService.fetchData({
        type: Device, filter: query => query.equalTo("NvrId", nvrId)
          .equalTo("Channel", channelId)
          .select("Channel", "NvrId", "Config")
          .limit(1)
        });
        return results && results.length>0 ? results[0] : undefined;
    }
    /** 取得當前Brand底下所有Model型號 */
    getModelList(currentBrandCapability:any): string[] {
        const result = [];
        if (!currentBrandCapability) {
            return result;
        } else {
            if (Array.isArray(currentBrandCapability.Devices.Device)) {
                currentBrandCapability.Devices.Device.forEach(element => {
                    result.push(element.Model);
                });
                ArrayHelper.sortString(result);
            } else {
                result.push(currentBrandCapability.Devices.Device.Model);
            }
            return result;
        }
    }

    /** 讀取指定model轉為CameraEditorParam物件 */
    getCameraEditorParam(model: string, data: Device, currentBrandCapability):CameraEditorParam {
        console.debug("currentBrandCapability", currentBrandCapability, model, data);
        if (!currentBrandCapability) {
            return undefined;
        }
        return new CameraEditorParam(currentBrandCapability, model, data);
    }
}
