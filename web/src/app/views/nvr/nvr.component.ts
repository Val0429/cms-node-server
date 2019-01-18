import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ParseService } from 'app/service/parse.service';
import { Nvr, Group, ServerInfo, PagerClass } from 'app/model/core';

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
  paging:PagerClass = new PagerClass();
  constructor(
    private parseService: ParseService,
    private nvrService:NvrService,
    private cameraService:CameraService ,
    
    ) { 
      this.flag = {busy: false}; 
      
    }

  async ngOnInit() {
    
    const getServerInfo$ = this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query.matches('Type', new RegExp('SmartMedia'), 'i')
    }).then(serverInfos => {
      this.iSapP2PServerList = serverInfos;
      console.debug("iSapP2PServerList",this.iSapP2PServerList);
    });

    await Observable.forkJoin([this.getGroup(), getServerInfo$, this.reloadData()]).toPromise();
    
  }
  optionChange(){
    this.pageChange(1);
  }
  private async getGroup() {
    return await this.parseService.fetchData({
      type: Group,
      filter: query => query.limit(Number.MAX_SAFE_INTEGER)
    }).then(groups => {
      this.groupList = groups;
    });
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
        promises.push(this.getGroup());
        await Observable.forkJoin(promises).toPromise();
      });
  }

  /** 取得所有Nvr */
  async getNvrs() {
    const getNvrs$ = this.nvrService.getNvrList(this.paging.page, this.paging.pageSize).then(nvrs => {
      this.nvrList = [];      
      nvrs.forEach(nvr=>{
        this.nvrList.push({device:nvr, checked:false, quantity:0});
      });
    });
    const getTotal$ = this.nvrService.getNvrCount().then(total=> this.paging.total=total);
    return await Promise.all([getNvrs$, getTotal$]);
  }

  async pageChange(event:number){
    this.paging.page = event;
    await this.reloadData();
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
  addNVR() {
    const newObj = this.nvrService.createNVRObject();
    const confirmText =  'Create new NVR?';
    if (confirm(confirmText)) {
      this.currentEditNVR = newObj;
    }
  }

  
}
export interface NvrList{device:Nvr,checked:boolean, quantity:number}