import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { ArrayHelper } from 'app/helper/array.helper';
import { ISearchCamera } from 'lib/domain/core';
import { CameraService } from 'app/service/camera.service';
import { Nvr, Group, Device } from 'app/model/core';
import StringHelper from 'app/helper/string.helper';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-camera-search',
  templateUrl: './camera-search.component.html',
  styleUrls: ['./camera-search.component.css']
})
export class CameraSearchComponent implements OnInit {
  
  @Output() closeModal: EventEmitter<any> = new EventEmitter();
  @Output() reloadDataEvent: EventEmitter<any> = new EventEmitter();
  @Input() ipCameraNvr:Nvr;  
  @Input() groupList:Group[];
  @Input() availableLicense:number;
  /** 搜尋結果 */
  searchList: SearchCameraResult[];    
  checkedAll:boolean;
  anyChecked:boolean;
  /** Flag:表示loading */
  /** 廠牌選單 */
  deviceVendors= DeviceVendor;
  @Input() flag:any;

  constructor(
    private coreService: CoreService, 
    private cameraService: CameraService) { }

   async saveAll(){    
      if (!confirm("Add selected camera(s)?")) return;

      try{
        this.flag.busy=true;
          
        let cams = this.searchList.filter(x=>x.checked===true).map(x=> x.device);
        console.debug("saved cams", cams);

        if (this.availableLicense < cams.length) {
          alert('License available count is not enough, can not add new IP Camera.');
          return;
        }

        let noGroup = this.groupList.find(x=>x.Name=="Non Main Group");
        let selectedSubGroup = noGroup.SubGroup[0];        
        await this.cameraService.saveCamera(cams, this.ipCameraNvr, selectedSubGroup, "");
        alert("Save camera(s) sucess");
        this.checkedAll=false;
        this.searchList=[];
        this.reloadDataEvent.emit();
        this.closeModal.emit();        
      }catch(err){
        console.error(err);
        alert(err);
      }finally{
        this.flag.busy=false;        
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
      let promises=[];
      this.searchList = [];
      this.flag.busy = true;
      for(let vendor of this.selectedVendors){
        let lowerVendor = vendor.toLowerCase()
        if(lowerVendor=="a-mtk"){
          lowerVendor = "amtk";
        }
       
        
        //push observerable item
        const search$ = (modelList:any[], capability:any) => this.coreService.proxyMediaServer({
          method: 'GET',
          path: this.coreService.urls.URL_MEDIA_SEARCH_CAMERA + '?vendor=' + lowerVendor
        }, 30000)
          .map(result => {
            let resultArray = ArrayHelper.toArray((result && result.Camera.DATA) ? result.Camera.DATA : []);
            let searchDisplay:SearchCameraResult[]=[];
            for(let searchResult of resultArray){

              const device = this.cameraService.getNewDevice({ nvrId: this.ipCameraNvr.Id, channel: 0, searchCamera: searchResult });
              // If no value or not on list, set value to first option
              if (StringHelper.isNullOrEmpty(device.Config.Model) || modelList.indexOf(device.Config.Model) < 0) {
                device.Config.Model = modelList[0];
              }  
              let editorParam = this.cameraService.getCameraEditorParam(device.Config.Model, device, capability);  
              if(editorParam){
                //refer to bug 9397
                editorParam.getCurrentStreamParam();
                device.Config.Stream.forEach(str=>{
                  console.debug("stream", str);
                  let resolutionOptions = editorParam.getResolutionOptionsByStreamId(str.Id);
                  if(resolutionOptions.length>0) str.Video.Resolution = resolutionOptions[0];
                });
                
                editorParam.getStreamSaveNumberBeforeSave();
                editorParam.getResolutionBeforeSave();
                editorParam.removeAttributesBeforeSave();
              }

              searchDisplay.push({checked:false, searchResult, device, saved:false})
            }
            this.searchList.push(...searchDisplay);
            this.searchList.sort((a:SearchCameraResult,
              b:SearchCameraResult) => 
                (a.searchResult.WANIP > b.searchResult.WANIP) ? 1 : ((b.searchResult.WANIP > a.searchResult.WANIP) ? -1 : 0));
          });
          //get brand capability
          const singleSearch = this.cameraService.getCapability(vendor).then(async capability=>{
            let modelList= this.cameraService.getModelList(capability);
            await search$(modelList, capability).toPromise();
          }); 
          promises.push(singleSearch);
      }
      await Observable.forkJoin(promises).toPromise();
    }catch(err){
      alert(err);
    }finally{
      this.flag.busy = false;
    }
  }
  selectedVendors:string[]=[];
  setVendors(checked: boolean, vendor:string) {
    if(checked===true) this.selectedVendors.push(vendor);
    else this.selectedVendors.splice(this.selectedVendors.findIndex(x=>x == vendor), 1);
    
    console.debug("this.selectedVendors", checked, this.selectedVendors);
  }

}
export interface SearchCameraResult{
  searchResult:ISearchCamera,   
  checked:boolean,
  device:Device,
  saved:boolean
}