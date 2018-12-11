import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ParseService } from 'app/service/parse.service';
import { Nvr, Device, NvrDisplay } from 'app/model/core';
import { NvrEditorComponent } from './nvr-editor/nvr-editor.component';
import { NvrService } from 'app/service/nvr.service';
import { NvrSearchComponent } from './nvr-search/nvr-search.component';

@Component({
  selector: 'app-nvr',
  templateUrl: './nvr.component.html',
  styleUrls: ['./nvr.component.css']
})
export class NvrComponent implements OnInit {
  @ViewChild('editor') editorComponent: NvrEditorComponent;
  @ViewChild('searchComponent') searchComponent:NvrSearchComponent;
  nvrList: NvrDisplay[];
  deviceList: Device[];
  licenseInfo: any;
  currentEditNVR: Nvr;


  checkedAll :boolean = false;
  anyChecked:boolean = false;
  
  // licenseCount: {
  //   device: number,
  //   thirdNvr: number,
  // } = {
  //     device: 0,
  //     thirdNvr: 0
  //   };
  constructor(
    private parseService: ParseService ,
    private nvrService:NvrService
    ) { }

  ngOnInit() {
    this.reloadData();
  }

  reloadData() {
    
    this.getNvrs()
      .switchMap(() => this.getDevices())      
      .map(()=> {
        this.checkSelected();
        this.currentEditNVR = undefined;        
        this.editorComponent.currentEditModel = undefined;
      })
      .subscribe();
  }

  /** 取得所有Nvr */
  getNvrs() {
    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query.limit(30000)
    }).then(nvrs => {
      this.nvrList = nvrs as NvrDisplay[];
      this.nvrList.sort(function (a, b) {
        return (Number(a.Id) > Number(b.Id)) ? 1 : ((Number(b.Id) > Number(a.Id)) ? -1 : 0);
      });
    }));
    return get$;
  }

  /** 取得所有Devices */
  getDevices() {
    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: Device,
      filter: query => query.ascending('Channel').limit(30000)
    }).then(devices => {
      this.deviceList = devices;
    }));
    return get$;
  }
  checkSelected(){
    let checked = this.nvrList.filter(x=>x.Id !== "1" && x.Id !== "2").map(function(e){return e.checked});
    //console.debug("checked",checked);
    this.checkedAll = checked.length > 0 && checked.indexOf(undefined) < 0 && checked.indexOf(false) < 0;
    this.anyChecked = checked.length > 0 && checked.indexOf(true) >= 0;
    console.debug("this.checkedAll",this.checkedAll);
    console.debug("this.anyChecked",this.anyChecked);
  }
  selectAll(checked:boolean){    
    for(let nvr of this.nvrList.filter(x=>x.Id !== "1" && x.Id !== "2")){
      nvr.checked=checked;
    }
    this.checkSelected();
  }
  selectNvr(nvr:NvrDisplay, checked:boolean){
    console.debug("nvr", nvr);
    nvr.checked=checked;
    this.checkSelected();
  }

  async deleteAll(){
    if (!confirm('Are you sure to delete these NVR(s)?')) return;
    let success = true;
    for(let nvr of this.nvrList){      
      if(nvr.checked !== true || nvr.Id ==="1" || nvr.Id === "2") continue;
        await this.nvrService.deleteNvr(nvr as Nvr).catch((err)=>{
          success = false;          
          alert(err);
        });
    }    
    if(success){
      alert('Delete Success'); 
      this.reloadData();
    } 
  }
  
  // 取得指定分類的License管制目標當前數量
  // readLicenseInfo() {
  //   const getDeviceCount$ = this.licenseService.getCurrentUsageCountByLicense('00166')
  //     .map(num => this.licenseCount.device = num);
  //   const getThirdNvrCount$ = this.licenseService.getCurrentUsageCountByLicense('00167')
  //     .map(num => this.licenseCount.thirdNvr = num);
  //   return getDeviceCount$.switchMap(() => getThirdNvrCount$);
  // }

  getDeviceQuantity(nvr: Nvr) {
    return this.deviceList ? this.deviceList.filter(x => x.NvrId === nvr.Id).length : 0;
  }

  clickEditNVR(data: Nvr) {
    const list = ['ipcamera'];
    if (list.indexOf(data.Driver.toLowerCase()) >= 0) {
      alert('This NVR data is not editable.');
      return;
    }
    this.currentEditNVR = data;
  }

  // 取得子模組回傳新的NVR物件並新增
  addNVR($event?) {
    const newObj = $event ? this.nvrService.createNVRObject($event.nvr) : this.nvrService.createNVRObject();
    const confirmText = $event ? 'Add this NVR?' : 'Create new NVR?';
    if (confirm(confirmText)) {
      this.currentEditNVR = newObj;
    }
  }

  
}
