import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { ArrayHelper } from 'app/helper/array.helper';
import { ISearchCamera } from 'lib/domain/core';
import { LicenseService } from 'app/service/license.service';
import { CameraService } from 'app/service/camera.service';
import { Nvr, Device } from 'app/model/core';

@Component({
  selector: 'app-camera-search',
  templateUrl: './camera-search.component.html',
  styleUrls: ['./camera-search.component.css']
})
export class CameraSearchComponent implements OnInit {
  
  @Output() closeModal: EventEmitter<any> = new EventEmitter();
  @Output() reloadDataEvent: EventEmitter<any> = new EventEmitter();

  @Input() cameraConfigs: {device:Device, checked:boolean, brandDisplay:string}[] = [];
  @Input() ipCameraNvr:Nvr;
  /** 搜尋結果 */
  searchList: {device:ISearchCamera, checked:boolean}[];    
  checkedAll:boolean;
  anyChecked:boolean;
  /** Flag:表示loading */
  /** 廠牌選單 */
  deviceVendors= DeviceVendor;
  flag = {
    load: false
  };
  constructor(
    private coreService: CoreService, 
    private cameraService: CameraService, 
    private licenseService:LicenseService) { }

   async saveAll(){    
      if (!confirm("Add selected camera(s)?")) return;
      console.debug("this.cameraConfigs",this.cameraConfigs)
      try{
        this.flag.load=true;
          
        let cams = this.searchList.filter(x=>x.checked===true);
        console.debug("saved cams", cams);

        let num = await this.licenseService.getLicenseAvailableCount('00171').toPromise(); 

        if (num < cams.length) {
          alert('License available count is not enough, can not add new IP Camera.');
          return;
        }        

        for(let cam of cams)  {
          const newCam = this.cameraService.getNewDevice({ nvrId: this.ipCameraNvr.Id, channel: this.cameraService.getNewChannelId(this.cameraConfigs.map(function(e){return e.device;})), searchCamera: cam.device });            
          await this.cameraService.getCapability(newCam, cam.device.COMPANY, []).toPromise(); 
          let editorParam = this.cameraService.getCameraEditorParam(newCam.Config.Model, newCam);
          //saves it before the value gets encrypted
          let tempAuth = Object.assign({}, newCam.Config.Authentication);
          await this.cameraService.saveCamera(newCam, this.ipCameraNvr, [], "", editorParam, "");
          //returns the value back
          newCam.Config.Authentication = Object.assign({}, tempAuth);
          //push new cam to camera list
          this.cameraConfigs.push({checked:false, device:newCam, brandDisplay:this.cameraService.getBrandDisplay(cam.device.COMPANY)});          
        }        
        alert("Save camera(s) sucess");
        this.checkedAll=false;
        this.searchList=[];
        this.reloadDataEvent.emit();
        this.closeModal.emit();        
      }catch(err){
        console.error(err);
        alert(err);
      }finally{
        this.flag.load=false;        
      }
    
  }
  
  getCompaneName(companyKey:string):string{
    return this.cameraService.getBrandDisplay(companyKey);
  }
  ngOnInit() {    
    
  }
  checkSelected(){
    let checked = this.searchList.map(function(e){return e.checked});
    //console.debug("checked",checked);
    this.checkedAll = checked.length > 0 && checked.indexOf(undefined) < 0 && checked.indexOf(false) < 0;
    this.anyChecked = checked.length > 0 && checked.indexOf(true) >= 0;
    console.debug("this.checkedAll",this.checkedAll);
    console.debug("this.anyChecked",this.anyChecked);
  }
  selectAll(checked:boolean){
    
    for(let cam of this.searchList){
      cam.checked=checked;
    }
    this.checkSelected();
  }
  selectCam(cam:{device:ISearchCamera, checked:boolean}, checked:boolean){
    console.debug("cam", cam);
    cam.checked=checked;
    this.checkSelected();
  }
  async clickSearch() {
    if (this.selectedVendors.length==0) {
      alert('Please select one Manufacturer.');
      return;
    }

    try{      
      this.searchList = [];
      this.flag.load = true;
      for(let vendor of this.selectedVendors){
        //push observerable item
        const search$ = this.coreService.proxyMediaServer({
          method: 'GET',
          path: this.coreService.urls.URL_MEDIA_SEARCH_CAMERA + '?vendor=' + vendor.toLowerCase()
        }, 30000)
          .map(result => {
            let resultArray = ArrayHelper.toArray((result && result.Camera.DATA) ? result.Camera.DATA : []);
            let searchDisplay:{device:ISearchCamera, checked:boolean}[]=[];
            for(let device of resultArray){
              searchDisplay.push({checked:false, device})
            }
            this.searchList.push(...searchDisplay);
          });
        await search$.toPromise();
      }
    }catch(err){
      alert(err);
    }finally{
      this.flag.load = false;
    }
  }
  selectedVendors:string[]=[];
  setVendors(checked: boolean, vendor:string) {
    if(checked===true) this.selectedVendors.push(vendor);
    else this.selectedVendors.splice(this.selectedVendors.findIndex(x=>x == vendor), 1);
    
    console.debug("this.selectedVendors", checked, this.selectedVendors);
  }

}
