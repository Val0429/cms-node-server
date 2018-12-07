import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { ArrayHelper } from 'app/helper/array.helper';
import { ISearchCamera } from 'lib/domain/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-camera-search',
  templateUrl: './camera-search.component.html',
  styleUrls: ['./camera-search.component.css']
})
export class CameraSearchComponent implements OnInit {
  @Output() addDevice: EventEmitter<any> = new EventEmitter();
  @Output() closeModal: EventEmitter<any> = new EventEmitter();
  /** 搜尋結果 */
  searchList: ISearchCamera[];
  /** Flag:表示loading */
  /** 廠牌選單 */
  deviceVendors= DeviceVendor;
  flag = {
    load: false
  };

  constructor(private coreService: CoreService) { }
  getCompaneName(companyKey:string):string{
    let company = this.deviceVendors.find(x=>x.Key == companyKey);
    return company ? company.Name : "undefined";
  }
  ngOnInit() {    
    
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
        }, 60000)
          .map(result => {
            let resultArray = ArrayHelper.toArray((result && result.Camera.DATA) ? result.Camera.DATA : []);
            this.searchList.push(...resultArray);
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

  getVendorParam(vendor: string) {
    const lower = vendor.toLowerCase();
    return lower;    
  }

  clickAddCamera(camera: ISearchCamera) {
    console.debug("clickAddCamera", camera);
    this.addDevice.emit(camera);
    this.closeModal.emit();
  }

}
