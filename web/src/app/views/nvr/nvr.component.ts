import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { LicenseService } from 'app/service/license.service';
import { ModalEditorModeEnum } from 'app/shared/enum/modalEditorModeEnum';
import { Nvr, Device } from 'app/model/core';

@Component({
  selector: 'app-nvr',
  templateUrl: './nvr.component.html',
  styleUrls: ['./nvr.component.css']
})
export class NvrComponent implements OnInit {
  // @ViewChild('editorComponent') editorComponent: ElementRef;
  nvrList: Nvr[];
  deviceList: Device[];
  licenseInfo: any;
  currentEditNVR: Nvr;
  // licenseCount: {
  //   device: number,
  //   thirdNvr: number,
  // } = {
  //     device: 0,
  //     thirdNvr: 0
  //   };
  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private licenseService: LicenseService
  ) { }

  ngOnInit() {
    this.reloadData();
  }

  reloadData() {
    this.getNvrs()
      .switchMap(() => this.getDevices())
      .subscribe();
  }

  /** 取得所有Nvr */
  getNvrs() {
    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query.limit(30000)
    }).then(nvrs => {
      this.nvrList = nvrs;
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
    const newObj = $event ? this.createNVRObject($event.nvr) : this.createNVRObject();
    const confirmText = $event ? 'Add this NVR?' : 'Create new NVR?';
    if (confirm(confirmText)) {
      this.currentEditNVR = newObj;
    }
  }

  /** 建立新Nvr物件 */
  createNVRObject(nvr?: any): any {
    const newObj = new Nvr({
      Name: nvr ? nvr.$.DeviceName : `New NVR`,
      Driver: nvr ? nvr.$.Driver : 'iSap',
      Manufacture: nvr ? nvr.$.Driver : 'iSap',
      Domain: nvr ? nvr.$.IP : '',
      Port: nvr ? Number(nvr.$.Port) : 80,
      ServerPort: 0,
      ServerStatusCheckInterval: 600,
      Account: '',
      Password: '',
      SSLEnable: false,
      IsListenEvent: true,
      IsPatrolInclude: true,
      BandwidthBitrate: 0,
      BandwidthStream: 1
    });
    return newObj;
  }
}
