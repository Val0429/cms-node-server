import { Component, OnInit, ViewChild } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { LicenseService } from 'app/service/license.service';
import { Observable } from 'rxjs/Observable';
import { ISearchCamera } from 'lib/domain/core';
import { Device, Nvr, Group } from 'app/model/core';
import { GroupService } from 'app/service/group.service';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { CameraService } from 'app/service/camera.service';
import { CameraSearchComponent } from './camera-search/camera-search.component';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})

export class CameraComponent implements OnInit {
  brandList = DeviceVendor;
  checkedAll: boolean = false;
  anyChecked: boolean = false;
  cameraConfigs: {device:Device, checked:boolean, brandDisplay:string}[] = [];
  groupList: Group[];
  selectedSubGroup: string; 
  /** IPCamera的唯一NvrId */
  ipCameraNvr: Nvr;
  licenseInfo: any;
  currentEditCamera: Device;
  /** 目前想複製的Camera */
  cloneCameraParam: {device:Device, quantity:number}= {
    device: undefined,
    quantity: 0
  };
 @ViewChild("searchComponent") searchComponent:CameraSearchComponent;

  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private cryptoService: CryptoService,
    private licenseService: LicenseService,
    private groupService: GroupService,
    private cameraService: CameraService
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
  async deleteAll(){
    if (!confirm('Are you sure to delete these Camera(s)?')) return;
    let success = true;
    for(let cam of this.cameraConfigs){
      if(cam.checked !== true) continue;
        await this.cameraService.deleteCam(cam.device, this.ipCameraNvr, this.groupList).catch((err)=>{
        alert(err);
        success=false;
      }); 
    }    
    if(success){
      alert('Delete Success');  
      this.reloadData();              
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
  selectCam(cam:{device:Device,checked:boolean,brandDisplay:string}, checked:boolean){
    console.debug("cam", cam);
    cam.checked=checked;
    this.checkSelected();
  }
  /** 取得IPCamera的NvrId */
  getIPCameraNvrId() {
    const get$ = Observable.fromPromise(this.parseService.getData({
      type: Nvr,
      filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
    })).do(nvr => this.ipCameraNvr = nvr);
    return get$;
  }

  /** 取得屬於IPCamera的Device資料 */
  fetchDevice() {
    this.cameraConfigs =[];
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: Device,
      filter: query => query.equalTo('NvrId', this.ipCameraNvr.Id)
        .ascending('Channel')
        .limit(30000)
    })).do(devices => {
      this.cameraConfigs = devices.map(dev => {
        dev.Config.Authentication.Account = this.cryptoService.decrypt4DB(dev.Config.Authentication.Account);
        dev.Config.Authentication.Password = this.cryptoService.decrypt4DB(dev.Config.Authentication.Password);
        let deviceDisplay:{device:Device,checked:boolean,brandDisplay:string} = {device:dev,checked:false,brandDisplay:""};        
        deviceDisplay.brandDisplay = this.cameraService.getBrandDisplay(deviceDisplay.device.Config.Brand);
        return deviceDisplay;
      });
      console.debug("this.cameraConfigs",this.cameraConfigs);
    }).do(() => this.cloneCameraParam.device = this.cameraConfigs[0].device);
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

        const newObj = this.cameraService.getNewDevice({ nvrId: this.ipCameraNvr.Id, channel: this.cameraService.getNewChannelId(this.cameraConfigs.map(function(e){return e.device})), searchCamera: $camera });
        const confirmText = $camera ? 'Add this device?' : 'Create new device manually?';
        if (confirm(confirmText)) {
          this.currentEditCamera = newObj;
        }
      })
      .subscribe();
  }

  /** 改變clone device下拉選單值 */
  setCloneDevice($event: any) {
    this.cloneCameraParam.device = this.cameraConfigs.find(x => x.device.id === $event.target.value).device;
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
          let obj = this.cameraService.cloneNewDevice({ cam: this.cloneCameraParam.device, newChannel: this.cameraService.getNewChannelId(this.cameraConfigs.map(function(e){return e.device}),cloneResult) }); 
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
            objectId: this.ipCameraNvr.id
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
