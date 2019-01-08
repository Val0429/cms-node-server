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
import { PagerService } from 'app/service/pager.service';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})

export class CameraComponent implements OnInit {
  
  flag = {
    busy: false
  };
  
  brandList = DeviceVendor;
  checkedAll: boolean = false;
  anyChecked: boolean = false;
  cameraConfigs: {device:Device, checked:boolean, brandDisplay:string}[] = [];
  groupList: Group[];  
  availableLicense:number=0;
  /** IPCamera的唯一NvrId */
  ipCameraNvr: Nvr;
  licenseInfo: any;
  currentEditCamera: Device;
  /** 目前想複製的Camera */
  cloneCameraParam: {device:Device, quantity:number}= {
    device: undefined,
    quantity: 0
  };
  paging:PagerService = new PagerService();
  
 @ViewChild("searchComponent") searchComponent:CameraSearchComponent;

  constructor(    
    private parseService: ParseService,
    private cryptoService: CryptoService,
    private licenseService: LicenseService,    
    private cameraService: CameraService,
    
  ) { 
    
  }

  async ngOnInit() {
    await Observable.forkJoin([
      this.getIPCameraNvr().then(async nvr=>{
        this.ipCameraNvr = nvr;
        await Observable.forkJoin([
          this.cameraService.getDeviceCount(this.ipCameraNvr.Id).then(total=>this.paging.total=total),
          this.fetchDevice()
        ]).toPromise();
      }),
      this.getGroup().then(groupList=>this.groupList=groupList),
      this.getAvailableLicense()
    ]).toPromise();
  }
  optionChange(option:number){    
    this.changePage(1);
  }
  private async getGroup() {
    return await Observable.fromPromise(this.parseService.fetchData({
      type: Group
    })).toPromise();
  }

  private async getAvailableLicense() {
    try{
      await Observable.fromPromise(this.licenseService.getLicenseAvailableCount('00171').toPromise()
      .then(num => {
        this.availableLicense = num;
        console.debug("num 00171", this.availableLicense);
      })).toPromise();
    }catch(err){
      console.error("unable to get license", err); 
      this.availableLicense=0;       
    }    
  }
  
  private async finish() {
    
    this.flag.busy = false;
    
    await this.reloadData();
  }

  async deleteAll(){
    if (!confirm('Are you sure to delete these Camera(s)?')) return;
    try{      
      this.flag.busy=true;
    
      let camIds = this.cameraConfigs.filter(x=>x.checked===true).map(function(e){return e.device.id});
      let result = await this.cameraService.deleteCam(camIds, this.ipCameraNvr.id);     
      console.debug("result.target", result.target);
      alert('Delete Success');
    }catch(err){
      console.error(err);
      alert(err);            
    }finally{
      await this.finish();
    }
  }
  async reloadData() {
    this.currentEditCamera = undefined;
    await Observable.forkJoin([
      this.getGroup().then(groupList=>this.groupList = groupList),
      this.cameraService.getDeviceCount(this.ipCameraNvr.Id).then(total=>this.paging.total = total),
      this.fetchDevice(),  
      this.getAvailableLicense(),
    ]).toPromise();    
    this.checkSelected();    
  }

  async changePage($event:number){
    this.paging.page=$event;
    this.currentEditCamera = undefined;
    await this.fetchDevice();
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
  async getIPCameraNvr() {
    return await Observable.fromPromise(this.parseService.getData({
      type: Nvr,
      filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
    })).toPromise();
  }
  
  /** 取得屬於IPCamera的Device資料 */
  async fetchDevice() {    
    this.cameraConfigs=[];
    
    let devices = await this.cameraService.getDevice(this.ipCameraNvr.Id, this.paging.page, this.paging.pageSize);         
    
    this.cameraConfigs = devices && devices.length > 0 ? 
    devices.map(dev => {
      dev.Config.Authentication.Account = this.cryptoService.decrypt4DB(dev.Config.Authentication.Account);
      dev.Config.Authentication.Password = this.cryptoService.decrypt4DB(dev.Config.Authentication.Password);
      let deviceDisplay:{device:Device,checked:boolean,brandDisplay:string} = {device:dev,checked:false,brandDisplay:""};        
      deviceDisplay.brandDisplay = this.cameraService.getBrandDisplay(deviceDisplay.device.Config.Brand);
      return deviceDisplay;
    }): [];
    
    console.debug("this.cameraConfigs", this.cameraConfigs);    
    this.cloneCameraParam.device = this.cameraConfigs.length>0 ? this.cameraConfigs[0].device : new Device();
    
  }

  /** 點擊新增 */
  addDevice() {
    // 檢查是否可新增
    
    if (this.availableLicense < 1) {
      alert('License available count is not enough, can not add new IP Camera.');
      return;
    } 

    const newObj = this.cameraService.getNewDevice({ nvrId: this.ipCameraNvr.Id, channel:0, searchCamera: undefined });
    
    if (confirm('Create new device manually?')) {
      this.currentEditCamera = newObj;      
    }
      
  }

  /** 改變clone device下拉選單值 */
  setCloneDevice($event: any) {
    this.cloneCameraParam.device = this.cameraConfigs.find(x => x.device.id === $event.target.value).device;
  }

  /** 點擊clone */
  async clickClone() {
    try{
      this.flag.busy=true;      
      //dummy 
      await Observable.of(null).toPromise();

      if (this.cloneCameraParam.quantity > this.availableLicense) {
        throw new Error("Not enough license to add new camera");        
      }      
      let result = await this.cameraService.cloneCam(this.cloneCameraParam.device, this.cloneCameraParam.quantity, this.ipCameraNvr);      
      alert("Clone Success");
    }catch(err){
      console.error(err);
      alert(err);
    }finally{
      await this.finish();
    }
  }
}
export interface ServerDeviceStatus{
  busy:boolean, deviceCount:number
}