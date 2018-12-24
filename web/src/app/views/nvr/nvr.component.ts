import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ParseService } from 'app/service/parse.service';
import { Nvr, Device, Group, ServerInfo } from 'app/model/core';

import { NvrService } from 'app/service/nvr.service';
import { NvrSearchComponent } from './nvr-search/nvr-search.component';


@Component({
  selector: 'app-nvr',
  templateUrl: './nvr.component.html',
  styleUrls: ['./nvr.component.css']
})
export class NvrComponent implements OnInit {
  
  @ViewChild('searchComponent') searchComponent:NvrSearchComponent;
  nvrList: {device:Nvr,checked:boolean}[];
  deviceList: Device[];
  licenseInfo: any;
  currentEditNVR: Nvr;
  checkedAll :boolean = false;
  anyChecked:boolean = false;
  groupList: Group[];
  iSapP2PServerList: ServerInfo[];
  
  constructor(
    private parseService: ParseService,
    private nvrService:NvrService    
    ) { }

  ngOnInit() {
    const getGroup$ = Observable.fromPromise(this.parseService.fetchData({
      type: Group,
      filter: query => query.limit(30000)
    }).then(groups => {
      this.groupList = groups;            
      this.reloadData();  
    }));
    const getServerInfo$ = Observable.fromPromise(this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query.matches('Type', new RegExp('SmartMedia'), 'i')
    }).then(serverInfos => {
      this.iSapP2PServerList = serverInfos;
      console.debug("iSapP2PServerList",this.iSapP2PServerList);
    }));
    getGroup$
      .switchMap(()=>getServerInfo$)
      .toPromise();
  }

  reloadData() {
    
    this.getNvrs()
      .switchMap(() => this.getDevices())      
      .map(()=> {
        this.checkSelected();
        this.currentEditNVR = undefined;                
      })
      .subscribe();
  }

  /** 取得所有Nvr */
  getNvrs() {
    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query.limit(30000)
    }).then(nvrs => {
      this.nvrList = [];

      for (let nvr of nvrs) this.nvrList.push({device:nvr,checked:false});
      
      this.nvrList.sort(function (a, b) {
        return (Number(a.device.Id) > Number(b.device.Id)) ? 1 : ((Number(b.device.Id) > Number(a.device.Id)) ? -1 : 0);
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
    let checked = this.nvrList.filter(x=>x.device.Id !== "1" && x.device.Id !== "2").map(function(e){return e.checked});
    //console.debug("checked",checked);
    this.checkedAll = checked.length > 0 && checked.indexOf(undefined) < 0 && checked.indexOf(false) < 0;
    this.anyChecked = checked.length > 0 && checked.indexOf(true) >= 0;
    console.debug("this.checkedAll",this.checkedAll);
    console.debug("this.anyChecked",this.anyChecked);
  }
  selectAll(checked:boolean){    
    for(let nvr of this.nvrList.filter(x=>x.device.Id !== "1" && x.device.Id !== "2")){
      nvr.checked=checked;
    }
    this.checkSelected();
  }
  selectNvr(nvr:{device:Nvr,checked:boolean}, checked:boolean){
    console.debug("nvr", nvr);
    nvr.checked=checked;
    this.checkSelected();
  }

  async deleteAll(){
    if (!confirm('Are you sure to delete these NVR(s)?')) return;
    try{    
      for(let nvr of this.nvrList.filter(x=> x.checked === true && x.device.Id !=="1" && x.device.Id !== "2")){          
          await this.nvrService.deleteNvr(nvr.device);
      }
      alert('Delete Success'); 
      this.reloadData();
    }catch(err) {
      console.error(err);
      alert(err);
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
