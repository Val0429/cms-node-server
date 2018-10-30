import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { ArrayHelper } from 'app/helper/array.helper';
import { ISearchCamera } from 'lib/domain/core';

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
  /** 搜尋廠牌 */
  searchVendor: string;
  /** Flag:表示loading */
  /** 廠牌選單 */
  deviceVendors: string[];
  flag = {
    load: false
  };

  constructor(private coreService: CoreService) { }

  ngOnInit() {
    this.deviceVendors = DeviceVendor.filter(x => x.Name.toLowerCase() !== 'customization').map(x => x.Name);
    this.searchVendor = this.deviceVendors[0];
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
      path: this.coreService.urls.URL_MEDIA_SEARCH_CAMERA + '?vendor=' + this.searchVendor
    }, 30000)
      .map(result => {
        this.searchList = ArrayHelper.toArray((result && result.Camera.DATA) ? result.Camera.DATA : []);
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
    this.searchVendor = this.getVendorParam($event.target.value);
    this.searchList = undefined;
  }

  getVendorParam(vendor: string) {
    const lower = vendor.toLowerCase();
    switch (lower) {
      case 'a-mtk':
      case 'd-link': return lower.replace('-', '');
      case 'ip surveillance': return lower.replace(' ', '');
      case 'xts corp.': return 'xts';
      default: return lower;
    }
  }

  clickAddCamera(camera: ISearchCamera) {
    console.log("clickAddCamera", camera);
    //camera.COMPANY = this.searchVendor; // 為了讓brand紀錄的大小寫完全符合，直接從選單複製
    this.addDevice.emit(camera);
    this.closeModal.emit();
  }

}
