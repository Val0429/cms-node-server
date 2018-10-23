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
  searchVendor: string;
  vendorOptions = NvrManufacturer.SearchList;
  jsonHelper = JsonHelper.instance;
  flag = {
    load: false
  };
  constructor(private coreService: CoreService) { }

  ngOnInit() {
    this.searchVendor = this.vendorOptions[0];
  }

  clickSearch() {
    if (!this.searchVendor) {
      alert('Please select one Manufacturer.');
      return;
    }
    this.flag.load = true;
    this.searchList = undefined;

    const search$ = this.coreService.proxyMediaServer({
      method: 'GET',
      path: this.coreService.urls.URL_MEDIA_SEARCH_DEVICE + '?vendor=' + this.searchVendor
    }, 30000)
      .map(result => {
        this.searchList = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(result, 'AllNVR.NVR'));
        if (!this.searchList) {
          this.searchList = [];
        }
      });

    search$
      .toPromise()
      .catch(alert)
      .then(() => this.flag.load = false);
  }

  setVendor($event: any) {
    const vendor = $event.target.value;
    this.searchVendor = vendor;
    this.searchList = undefined;
  }

  // 將搜尋到的NVR回傳給父組件新增
  clickAddNVR(nvr: any) {
    nvr.$.Driver = this.searchVendor;
    this.addNVR.emit({ nvr: nvr });
  }
}
