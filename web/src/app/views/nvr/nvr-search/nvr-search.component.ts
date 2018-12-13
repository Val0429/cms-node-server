import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { NvrManufacturer } from 'app/config/nvr-manufacturer.config';
import JsonHelper from 'app/helper/json.helper';
import ArrayHelper from 'app/helper/array.helper';
import { NvrService } from 'app/service/nvr.service';
import { Group, ServerInfo } from 'app/model/core';
import { ParseService } from 'app/service/parse.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-nvr-search',
  templateUrl: './nvr-search.component.html',
  styleUrls: ['./nvr-search.component.css']
})
export class NvrSearchComponent implements OnInit {
  
  @Output() closeModal: EventEmitter<any> = new EventEmitter();
  @Output() reloadDataEvent: EventEmitter<any> = new EventEmitter();
  
  iSapP2PServerList: ServerInfo[];

  searchList: {device:any, checked:boolean}[];
  
  vendorOptions = NvrManufacturer.SearchList;
  jsonHelper = JsonHelper.instance;
  flag = {
    load: false
  };
  checkedAll: boolean;
  anyChecked: boolean;
  constructor(
    private coreService: CoreService,
    private nvrService:NvrService,
    private parseService:ParseService
    ) { }

  ngOnInit() {
    const getServerInfo$ = Observable.fromPromise(this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query.matches('Type', new RegExp('SmartMedia'), 'i')
    }).then(serverInfos => this.iSapP2PServerList = serverInfos));

    
    getServerInfo$
      .subscribe();
  }
  async saveAll(){    
    if (!confirm("Add selected NVR(s)?")) return;
    try{
      this.flag.load=true;
        
      let nvrs = this.searchList.filter(x=>x.checked===true);
      console.debug("saved nvrs", nvrs);

      for(let nvr of nvrs)  {
        let newNvr = this.nvrService.createNVRObject(nvr.device);         
        let editNvr = this.nvrService.setEditModel(newNvr,[],this.iSapP2PServerList);
        await this.nvrService.saveNvr(newNvr, editNvr).toPromise();
      }
      
      alert("Save NVR(s) sucess");
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

  async clickSearch() {
    if (this.selectedVendors.length==0) {
      alert('Please select one Manufacturer.');
      return;
    }
    try{
    this.flag.load = true;
    this.searchList = [];
      for(let vendor of this.selectedVendors){
    const search$ = this.coreService.proxyMediaServer({
      method: 'GET',
      path: this.coreService.urls.URL_MEDIA_SEARCH_DEVICE + '?vendor=' + vendor
    }, 30000)
      .map(result => {
        if(!result)return;
        
        console.debug("nvr search result", result);
        let allNvr = this.jsonHelper.findAttributeByString(result, 'AllNVR.NVR');
        let resultArray = ArrayHelper.toArray( allNvr ? allNvr : []);
        for(let nvr of resultArray){
          this.searchList.push({device:nvr, checked:false});
        }
        
      });

      await search$.toPromise();
      }
    }catch(error){
      alert(error);
    }
      finally{ this.flag.load = false;
      }
  }

  selectedVendors:string[]=[];
  setVendors(checked: boolean, vendor:string) {
    if(checked===true) this.selectedVendors.push(vendor);
    else this.selectedVendors.splice(this.selectedVendors.findIndex(x=>x == vendor), 1);
    
    console.debug("this.selectedVendors", checked, this.selectedVendors);
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
    for(let nvr of this.searchList){
      nvr.checked=checked;
    }
    this.checkSelected();
  }
  selectNvr(nvr:{device:any, checked:boolean}, checked:boolean){
    console.debug("nvr", nvr);
    nvr.checked=checked;
    this.checkSelected();
  }
}
