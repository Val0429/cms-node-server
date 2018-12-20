import { Component, OnInit, ViewChild } from '@angular/core';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { LicenseService } from 'app/service/license.service';
import { Observable } from 'rxjs/Observable';
import { ISearchCamera } from 'lib/domain/core';
import { Device, Nvr, Group } from 'app/model/core';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { CameraService } from 'app/service/camera.service';
import { CameraSearchComponent } from './camera-search/camera-search.component';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})

export class CameraComponent implements OnInit {
  p: number = 1;
  flag = {
    save: false,
    delete: false
  };

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
    private parseService: ParseService,
    private cryptoService: CryptoService,
    private licenseService: LicenseService,    
    private cameraService: CameraService
  ) { }

  ngOnInit() {
    this.getIPCameraNvr()
      .switchMap(() => this.fetchDevice())
      .subscribe();

      const getGroup$ = this.getGroup();
      
      getGroup$     
        .switchMap(() =>  this.getAvailableLicense())
        .toPromise()
        .catch(alert);
  }

  private getGroup() {
    return Observable.fromPromise(this.parseService.fetchData({
      type: Group
    }).then(groups => {
      this.groupList = groups;
      console.debug("this.groupList", this.groupList);
    }));
  }

  private getAvailableLicense() {
    return Observable.fromPromise(this.licenseService.getLicenseAvailableCount('00171').toPromise()
      .then(num => {
        this.availableLicense = num;
        console.debug("num 00171", this.availableLicense);
      }));
  }

  async deleteAll(){
    if (!confirm('Are you sure to delete these Camera(s)?')) return;
    try{
      this.flag.delete=true;

      let camIds = this.cameraConfigs.filter(x=>x.checked===true).map(function(e){return e.device.id});
      await this.cameraService.deleteCam(camIds, this.ipCameraNvr.id);                    
         
      alert('Delete Success');  
      this.reloadData();              
    }catch(err){
      console.error(err);
      alert(err);      
    }finally{
      this.flag.delete=false;
    }
  }
  reloadData() {
    this.currentEditCamera = undefined;
    const getGroup$ = this.getGroup();
    this.fetchDevice()
      .switchMap(()=>getGroup$)
      .switchMap(()=>this.getAvailableLicense())
      .subscribe();
    this.checkSelected();
    this.p=1;
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
  getIPCameraNvr() {
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
      this.cameraConfigs = devices && devices.length>0 ? 
      devices.map(dev => {
        dev.Config.Authentication.Account = this.cryptoService.decrypt4DB(dev.Config.Authentication.Account);
        dev.Config.Authentication.Password = this.cryptoService.decrypt4DB(dev.Config.Authentication.Password);
        let deviceDisplay:{device:Device,checked:boolean,brandDisplay:string} = {device:dev,checked:false,brandDisplay:""};        
        deviceDisplay.brandDisplay = this.cameraService.getBrandDisplay(deviceDisplay.device.Config.Brand);
        return deviceDisplay;}):
        [];
      //console.debug("this.cameraConfigs",this.cameraConfigs);
    })
    .do(() => this.cloneCameraParam.device = this.cameraConfigs.length>0 ? this.cameraConfigs[0].device : new Device());
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

        const newObj = this.cameraService.getNewDevice({ nvrId: this.ipCameraNvr.Id, channel:0,
          searchCamera: $camera });
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
  availableLicense:number=0;
  /** 點擊clone */
  async clickClone() {
    try{
      this.flag.save=true;
      //dummy 
      await Observable.of(null).toPromise();

      if (this.cloneCameraParam.quantity > this.availableLicense) {
        alert("Not enough license to add new camera");
        return;
      }
      
      await this.cameraService.cloneCam(this.cloneCameraParam.device, this.cloneCameraParam.quantity, this.ipCameraNvr);
      
      this.reloadData();
      alert('Clone success.');
      
    }catch(err){
      console.error(err);
      alert(err);
    }finally{
      this.flag.save=false;
    }
  }
}
