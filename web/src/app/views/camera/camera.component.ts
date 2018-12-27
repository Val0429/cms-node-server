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
  options=[20, 50, 100, 500, 1000];
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
  pageSize:number=50;
  total:number=0;
  progress:number=100;
 @ViewChild("searchComponent") searchComponent:CameraSearchComponent;

  constructor(    
    private parseService: ParseService,
    private cryptoService: CryptoService,
    private licenseService: LicenseService,    
    private cameraService: CameraService
  ) { }

  async ngOnInit() {
    let result:ServerDeviceStatus = await this.cameraService.getStatus();
    console.debug("serverStatus", result);
    this.flag.delete = result.busy;
    this.flag.save = result.busy;

    this.ipCameraNvr = await this.getIPCameraNvr();
    this.total = await this.cameraService.getDeviceCount(this.ipCameraNvr.Id);
    await this.fetchDevice();      

    this.groupList = await this.getGroup();

    console.debug("this.groupList", this.groupList);
      
    //let it unwaited
    this.getAvailableLicense();
      
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
  checkServerStatus(total:number, finish:number, message:string){
    let current=0;
    let trial=0;
    let timer = setInterval(async ()=>{
      try{
        let result:ServerDeviceStatus = await this.cameraService.getStatus();
        console.debug("serverStatus", result);        
        if(current != result.deviceCount){
          //there's progress
          current = result.deviceCount;          
          //reset trial count
          trial=0;          
          //update progress
          this.progress = 100 - Math.round(Math.abs(current - finish) / total * 100);          
        }
        else{ 
          //no progress
          trial++;
        }
        //target match or trial more than 5 times or server is not busy
        if(current == finish || trial > 5 || result.busy !== true){
          clearInterval(timer);
          await this.finish();
          alert(message);                    
        }
      }catch(err){
        clearInterval(timer);
        await this.finish();
        alert(err);
        
      }
    }, 5000);
  }

  private async finish() {
    this.flag.delete = false;
    this.flag.save = false;
    this.progress=100;    
    await this.reloadData();
  }

  async deleteAll(){
    if (!confirm('Are you sure to delete these Camera(s)?')) return;
    try{      
      this.flag.delete=true;
      this.progress=0;
      let camIds = this.cameraConfigs.filter(x=>x.checked===true).map(function(e){return e.device.id});
      let result = await this.cameraService.deleteCam(camIds, this.ipCameraNvr.id);     
      console.debug("result.target", result.target);
      this.checkServerStatus(camIds.length, result.target, 'Delete Success');
    }catch(err){
      console.error(err);
      alert(err);      
      this.flag.delete=false;
      this.progress=100;
    }
  }
  async reloadData() {
    this.currentEditCamera = undefined;
    this.groupList = await this.getGroup();
    this.total = await this.cameraService.getDeviceCount(this.ipCameraNvr.Id);
    await this.fetchDevice();
    
    this.getAvailableLicense();
    this.checkSelected();    
  }

  async changePage($event:number){
    this.p=$event;
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
    
    let devices = await this.cameraService.getDevice(this.ipCameraNvr.Id, this.p, this.pageSize);         
    
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
      this.flag.save=true;
      this.progress=0;
      //dummy 
      await Observable.of(null).toPromise();

      if (this.cloneCameraParam.quantity > this.availableLicense) {
        throw new Error("Not enough license to add new camera");        
      }      
      let result = await this.cameraService.cloneCam(this.cloneCameraParam.device, this.cloneCameraParam.quantity, this.ipCameraNvr);                  
      console.debug("result.target", result.target);
      this.checkServerStatus(this.cloneCameraParam.quantity, result.target, "Clone Success");
    }catch(err){
      console.error(err);
      this.flag.save=false;
      this.progress=100;
      alert(err);
    }
  }
}
export interface ServerDeviceStatus{
  busy:boolean, deviceCount:number
}