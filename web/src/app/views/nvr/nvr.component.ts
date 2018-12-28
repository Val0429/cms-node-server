import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ParseService } from 'app/service/parse.service';
import { Nvr, Device, Group, ServerInfo } from 'app/model/core';

import { NvrService } from 'app/service/nvr.service';
import { NvrSearchComponent } from './nvr-search/nvr-search.component';
import { CameraService } from 'app/service/camera.service';


@Component({
  selector: 'app-nvr',
  templateUrl: './nvr.component.html',
  styleUrls: ['./nvr.component.css']
})
export class NvrComponent implements OnInit {
  
  @ViewChild('searchComponent') searchComponent:NvrSearchComponent;
  nvrList: NvrList[];
  
  licenseInfo: any;
  currentEditNVR: Nvr;
  checkedAll :boolean = false;
  anyChecked:boolean = false;
  groupList: Group[];
  iSapP2PServerList: ServerInfo[];
  flag:{
    busy:boolean;
  }
  constructor(
    private parseService: ParseService,
    private nvrService:NvrService,
    private cameraService:CameraService    
    ) { 
      this.flag = {busy: false};   
    }

  async ngOnInit() {
    const getGroup$ = this.parseService.fetchData({
      type: Group,
      filter: query => query.limit(30000)
    }).then(groups => {
      this.groupList = groups;       
    });
    const getServerInfo$ = this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query.matches('Type', new RegExp('SmartMedia'), 'i')
    }).then(serverInfos => {
      this.iSapP2PServerList = serverInfos;
      console.debug("iSapP2PServerList",this.iSapP2PServerList);
    });

    await Observable.forkJoin([getGroup$, getServerInfo$, this.reloadData()]).toPromise();
    
  }

  async reloadData() {
    
    await this.getNvrs()      
      .then(async ()=> {
        this.checkSelected();
        this.currentEditNVR = undefined;
        let promises=[];
        this.nvrList.forEach(nvr=>{
          promises.push(this.cameraService.getDeviceCount(nvr.device.Id).then(num=>nvr.quantity = num));
        });          
        await Observable.forkJoin(promises).toPromise();
      });
  }

  /** 取得所有Nvr */
  getNvrs() {
    const get$ = this.parseService.fetchData({
      type: Nvr,      
      filter: query => query.limit(30000).ascending("Id")
    }).then(nvrs => {
      this.nvrList = [];
      nvrs.forEach(nvr=>{
        this.nvrList.push({device:nvr, checked:false, quantity:0});
      });
    });
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
      this.flag.busy=true;       
      await this.nvrService.deleteNvr(this.nvrList.filter(x=> x.checked === true && x.device.Id !=="1" && x.device.Id !== "2").map(x=>x.device.id));      
      alert('Delete Success'); 
      await this.reloadData();
    }catch(err) {
      console.error(err);
      alert(err);
    }finally{
      this.flag.busy=false;
    }
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
export interface NvrList{device:Nvr,checked:boolean, quantity:number}