import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { NvrManufacturer } from 'app/config/nvr-manufacturer.config';
import { Observable } from 'rxjs/Observable';
import JsonHelper from 'app/helper/json.helper';
import ArrayHelper from 'app/helper/array.helper';

@Component({
  selector: 'app-nvr-search',
  templateUrl: './nvr-search.component.html',
  styleUrls: ['./nvr-search.component.css']
})
export class NvrSearchComponent implements OnInit {
  @Output() addNVR: EventEmitter<any> = new EventEmitter();
  searchList: any;
  
  vendorOptions = NvrManufacturer.SearchList;
  jsonHelper = JsonHelper.instance;
  flag = {
    load: false
  };
  constructor(private coreService: CoreService) { }

  ngOnInit() {
    
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
        this.searchList.push(...resultArray);
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

  // 將搜尋到的NVR回傳給父組件新增
  clickAddNVR(nvr: any) {
    console.debug("nvr", nvr);
    //nvr.$.Driver = this.searchVendor;
    this.addNVR.emit({ nvr: nvr });
  }
}
