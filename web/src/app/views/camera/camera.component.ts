import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { LicenseService } from 'app/service/license.service';
import { Observable } from 'rxjs/Observable';
import { ISearchCamera } from 'lib/domain/core';
import { Device, Nvr } from 'app/model/core';
import ArrayHelper from 'app/helper/array.helper';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})
export class CameraComponent implements OnInit {
  cameraConfigs: Device[] = [];
  /** IPCamera的唯一NvrId */
  ipCameraNvrId: string;
  licenseInfo: any;
  currentEditCamera: Device;
  /** 目前想複製的Camera */
  cloneCameraParam = {
    device: undefined,
    quantity: 0
  };

  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private cryptoService: CryptoService,
    private licenseService: LicenseService
  ) { }

  ngOnInit() {
    this.getIPCameraNvrId()
      .switchMap(() => this.fetchDevice())
      .subscribe();
  }

  reloadData() {
    this.currentEditCamera = undefined;
    this.fetchDevice().subscribe();
  }

  /** 取得IPCamera的NvrId */
  getIPCameraNvrId() {
    const get$ = Observable.fromPromise(this.parseService.getData({
      type: Nvr,
      filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
    })).do(nvr => this.ipCameraNvrId = nvr.Id);
    return get$;
  }

  /** 取得屬於IPCamera的Device資料 */
  fetchDevice() {
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: Device,
      filter: query => query.equalTo('NvrId', this.ipCameraNvrId)
        .ascending('Channel')
        .limit(30000)
    })).do(devices => this.cameraConfigs = devices.map(dev => {
      dev.Config.Authentication.Account = this.cryptoService.decrypt4DB(dev.Config.Authentication.Account);
      dev.Config.Authentication.Password = this.cryptoService.decrypt4DB(dev.Config.Authentication.Password);
      return dev;
    })).do(() => this.cloneCameraParam.device = this.cameraConfigs[0]);
    return fetch$;
  }

  /** 點擊新增 */
  addDevice($camera?: ISearchCamera) {
    // 檢查是否可新增
    this.licenseService.getLicenseAvailableCount('00171')
      .map(num => {
        if (num < 1) {
          alert('License available count is not enough, can not add new IP Camera.');
          return;
        }

        const newObj = this.getNewDevice({ nvrId: this.ipCameraNvrId, channel: this.getNewChannelId(), searchCamera: $camera });
        const confirmText = $camera ? 'Add this device?' : 'Create new device manually?';
        if (confirm(confirmText)) {
          this.currentEditCamera = newObj;
        }
      })
      .subscribe();
  }

  /** 建立新Device */
  getNewDevice(args: { nvrId: string, searchCamera: any, channel: number }) {
    const obj = new Device();
    obj.NvrId = args.nvrId;
    obj.Name = args.searchCamera ? args.searchCamera.HOSTNAME : 'New Camera';
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

  /** 利用指定資料clone出新的Device */
  cloneNewDevice(args: { cam: Device, newChannel: number }) {
    const obj = new Device();
    obj.NvrId = '1',
      obj.Name = args.cam.Name,
      obj.Channel = args.newChannel;
    obj.Config = args.cam.Config;
    obj.Config.Authentication.Account = this.cryptoService.encrypt4DB(obj.Config.Authentication.Account);
    obj.Config.Authentication.Password = this.cryptoService.encrypt4DB(obj.Config.Authentication.Password);
    obj.Capability = args.cam.Capability;
    obj.CameraSetting = args.cam.CameraSetting;
    obj.Tags = args.cam.Tags;
    return obj;
  }

  /** 取得適當的新ChannelId */
  getNewChannelId(tempChannel?: Device[]): number {
    const list = this.cameraConfigs.concat(tempChannel || []);
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

  /** 改變clone device下拉選單值 */
  setCloneDevice($event: any) {
    this.cloneCameraParam.device = this.cameraConfigs.find(x => x.id === $event.target.value);
  }

  /** 點擊clone */
  clickClone() {
    const availableLicense$ = this.licenseService.getLicenseAvailableCount('00171');

    availableLicense$
      .switchMap(num => {
        if (this.cloneCameraParam.quantity === 0) {
          return Observable.of(null);
        }
        const cloneResult = [];
        for (let i = 0; i < this.cloneCameraParam.quantity; i++) {
          cloneResult.push(this.cloneNewDevice({ cam: this.cloneCameraParam.device, newChannel: this.getNewChannelId(cloneResult) }));
        }

        return Observable.fromPromise(Parse.Object.saveAll(cloneResult))
        .map(result => {
          
          this.coreService.addNotifyData({
            path: this.coreService.urls.URL_CLASS_NVR,
            objectId: this.cloneCameraParam.device.id
          });

          return this.coreService.notifyWithParseResult({
            parseResult: cloneResult, path: this.coreService.urls.URL_CLASS_DEVICE
          });

        });
          
      })
      .toPromise()
      .then(()=>{
        this.reloadData();
        alert('Clone success.');
      })
      .catch(alert);
  }
}
