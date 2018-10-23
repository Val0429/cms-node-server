import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { LicenseService } from 'app/service/license.service';
import { ModalEditorModeEnum } from 'app/shared/enum/modalEditorModeEnum';
import { LicenseProduct } from 'app/config/license-product.config';
import { Observable } from 'rxjs/Observable';
import { ILicenseInfo, ILicenseStatistics } from 'lib/domain/core';
import { Nvr, Device } from 'app/model/core';
import ArrayHelper from 'app/helper/array.helper';
import { ClassField } from '@angular/compiler/src/output/output_ast';

@Component({
  selector: 'app-license',
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.css']
})
export class LicenseComponent implements OnInit {
  /** MediaServer回傳license資料 */
  licenseInfo: ILicenseInfo;
  statistics: ILicenseStatistics[];
  currentEditorMode: ModalEditorModeEnum = ModalEditorModeEnum.NONE;
  licenseProduct = LicenseProduct;
  nvrConfigs: Nvr[];
  deviceConfigs: Device[];

  constructor(private coreService: CoreService, private licenseService: LicenseService) { }

  ngOnInit() {
    Observable.combineLatest(
      this.coreService.getConfig({ path: this.coreService.urls.URL_CLASS_NVR }),
      this.coreService.getConfig({ path: this.coreService.urls.URL_CLASS_DEVICE }), // 當前已勾選Device資訊(參考用)
      (response1, response2) => {
        this.nvrConfigs = response1.results;
        this.deviceConfigs = response2.results;
      }
    ).map(() => this.reloadLicenseInfo())
      .subscribe();
  }

  reloadLicenseInfo() {
    const reload$ = this.coreService.proxyMediaServer({
      method: 'GET',
      path: this.coreService.urls.URL_MEDIA_LICENSE_INFO
    })
      .map(result => this.licenseInfo = result.License)
      .map(() => this.licenseInfo.Adaptor = ArrayHelper.toArray(this.licenseInfo.Adaptor))
      .map(() => this.countLicenseUsed());

    this.licenseService.getLicenseLimit()
      .switchMap(() => reload$)
      .subscribe();
  }

  /** 重新計算每種key的授權數量, 已使用數量, 未使用數量 */
  countLicenseUsed() {
    this.initStatistics();

    // 分類所有License Key
    this.licenseInfo.Adaptor.forEach(adp => {
      if (!adp.Key) {
        return;
      }
      adp.Key = ArrayHelper.toArray(adp.Key);
      // 把license key放到相應ProductNo並計算license總量
      adp.Key.forEach(key => {
        const type = this.statistics.find(x => x.ProductNo === key.$.ProductNO || x.ProductNo === '99999');
        if (type) {
          type.License.push({
            LicenseKey: key.$.val,
            MAC: adp.MAC,
            LicenseCount: Number(key.$.Count),
            Trial: key.$.Trial === '1' ? true : false,
            RegisterDate: key.$.RegisterDate,
            ExpireDate: key.$.ExpireDate,
            Expired: key.$.Expired === '1' ? true : false
          });
          type.LicenseCount += key.$.Expired === '1' ? 0 : Number(key.$.Count);
          type.UsageCount = 0;
        }
      });
    });

    // 統計各type的使用數量
    this.statistics.forEach(type => {
      this.licenseService.getCurrentUsageCountByLicense(type.ProductNo)
        .map(count => type.UsageCount = count)
        .subscribe();
    });
  }

  /** 初始化統計 */
  initStatistics() {
    this.statistics = [];
    this.licenseProduct.forEach(type => {
      this.statistics.push({
        ProductNo: type.No,
        ProductType: type.Type,
        Description: type.Description,
        License: [],
        LicenseCount: 0,
        UsageCount: 0
      });
    });
  }

  clickOnlineRegistration() {
    this.currentEditorMode = ModalEditorModeEnum.ONLINE_REGISTRATION;
  }

  clickOfflineRegistration() {
    this.currentEditorMode = ModalEditorModeEnum.OFFLINE_REGISTRATION;
  }
}
