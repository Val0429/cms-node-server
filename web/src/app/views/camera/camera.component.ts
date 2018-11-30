import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { LicenseService } from 'app/service/license.service';
import { Observable } from 'rxjs/Observable';
import { ISearchCamera } from 'lib/domain/core';
import { Device, Nvr, DeviceDisplay, RecordSchedule, EventHandler, Group } from 'app/model/core';
import { GroupService } from 'app/service/group.service';
import { DeviceVendor } from 'app/config/device-vendor.config';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})

export class CameraComponent implements OnInit {
  brandList = DeviceVendor;
  checkedAll :boolean = false;
  anyChecked:boolean = false;
  cameraConfigs: DeviceDisplay[] = [];
  groupList: Group[];
  selectedSubGroup: string; 
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
    private licenseService: LicenseService,
    private groupService: GroupService
  ) { }

  ngOnInit() {
    this.getIPCameraNvrId()
      .switchMap(() => this.fetchDevice())
      .subscribe();

      const getGroup$ = Observable.fromPromise(this.parseService.fetchData({
        type: Group
      }).then(groups => {
        this.groupList = groups;
        console.debug("this.groupList",this.groupList)
      }));
      
      getGroup$      
      .toPromise()
      .catch(alert);
  }
  deleteCam(cam : Device){

      const delete$ = Observable.fromPromise(cam.destroy())
        .map(result => {
          this.coreService.addNotifyData({
            path: this.coreService.urls.URL_CLASS_NVR,
            objectId: cam.id
          });
          this.coreService.addNotifyData({
            path: this.coreService.urls.URL_CLASS_DEVICE,
            objectId: cam.id
          });
        });

      // 刪除與此Camera相關的RecordSchedule
      const removeRecordSchedule$ = Observable.fromPromise(this.parseService.fetchData({
        type: RecordSchedule,
        filter: query => query
          .equalTo('NvrId', cam.NvrId)
          .equalTo('ChannelId', cam.Channel)
      }))
        .switchMap(schedules => Observable.fromPromise(Parse.Object.destroyAll(schedules)))
        .map(results => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_RECORDSCHEDULE, dataArr: results }));

      // 刪除與此Camera相關的EventHandler
      const removeEventHandler$ = Observable.fromPromise(this.parseService.fetchData({
        type: EventHandler,
        filter: query => query
          .equalTo('NvrId',  cam.NvrId)
          .equalTo('DeviceId', cam.Channel)
      }))
        .switchMap(handler => Observable.fromPromise(Parse.Object.destroyAll(handler)))
        .map(results => this.coreService.notifyWithParseResult({
          parseResult: results, path: this.coreService.urls.URL_CLASS_EVENTHANDLER
        }));

      delete$
        .switchMap(() => removeRecordSchedule$)
        .switchMap(() => removeEventHandler$)  
        .switchMap(() => this.groupService.setChannelGroup(
          this.groupList, { Nvr: cam.NvrId, Channel: cam.Channel }, undefined))     
        .toPromise()
        .catch(alert)
        .then(()=>{
          this.reloadData();
        });
  }
  deleteAll(){
    if (!confirm('Are you sure to delete these Camera(s)?')) return;

    for(let cam of this.cameraConfigs){
      if(cam.checked !== true) continue;
      this.deleteCam(cam as Device);        
    }    
  }
  reloadData() {
    this.currentEditCamera = undefined;
    this.fetchDevice().subscribe();
    this.checkSelected();
  }
  checkSelected(){
    let checked = this.cameraConfigs.map(function(e){return e.checked});
    //console.debug("checked",checked);
    this.checkedAll = checked.length > 0 && checked.indexOf(undefined) < 0 && checked.indexOf(false) < 0;
    this.anyChecked = checked.length > 0 && checked.indexOf(true) >= 0;
    console.debug("this.checkedAll",this.checkedAll);
    console.debug("this.anyChecked",this.anyChecked);
  }
  selectAll(checked:boolean){
    
    for(let cam of this.cameraConfigs){
      cam.checked=checked;
    }
    this.checkSelected();
  }
  selectCam(cam:DeviceDisplay, checked:boolean){
    console.debug("cam", cam);
    cam.checked=checked;
    this.checkSelected();
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
    this.cameraConfigs =[];
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: Device,
      filter: query => query.equalTo('NvrId', this.ipCameraNvrId)
        .ascending('Channel')
        .limit(30000)
    })).do(devices => {
      this.cameraConfigs = devices.map(dev => {
        dev.Config.Authentication.Account = this.cryptoService.decrypt4DB(dev.Config.Authentication.Account);
        dev.Config.Authentication.Password = this.cryptoService.decrypt4DB(dev.Config.Authentication.Password);
        let device = dev as DeviceDisplay;
        let brand = this.brandList.find(x=>x.Key == device.Config.Brand);
        device.brandDisplay = brand ? brand.Name : device.Config.Brand;
        return device;
      });
      console.debug("this.cameraConfigs",this.cameraConfigs);
    }).do(() => this.cloneCameraParam.device = this.cameraConfigs[0]);
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
  getNewChannelId(tempChannel?: DeviceDisplay[]): number {
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
        
        this.selectedSubGroup = this.groupService.findDeviceGroup(this.groupList, { Nvr: this.cloneCameraParam.device.NvrId, Channel: this.cloneCameraParam.device.Channel });

        const cloneResult = [];
        for (let i = 0; i < this.cloneCameraParam.quantity; i++) {
          let obj = this.cloneNewDevice({ cam: this.cloneCameraParam.device, newChannel: this.getNewChannelId(cloneResult) }); 
          cloneResult.push(obj);
        }

        return Observable.fromPromise(
          Parse.Object.saveAll(cloneResult))               
        .map(result => {
        
            for(let device of cloneResult){
            this.groupService.setChannelGroup(this.groupList, { Nvr: device.NvrId, Channel: device.Channel }, this.selectedSubGroup)
            }
        
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
