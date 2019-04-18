import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { LicenseService } from 'app/service/license.service';
import { ModalEditorModeEnum } from 'app/shared/enum/modalEditorModeEnum';
import { LicenseProduct } from 'app/config/license-product.config';
import { Observable } from 'rxjs/Observable';
import { ILicenseInfo, ILicenseStatistics } from 'lib/domain/core';
import { Nvr, Device, ServerInfo } from 'app/model/core';
import ArrayHelper from 'app/helper/array.helper';
import { ParseService } from 'app/service/parse.service';
import { OnlineRegistrationComponent } from './online-registration/online-registration.component';

@Component({
  selector: 'app-license',
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.css']
})
export class LicenseComponent implements OnInit {
  

  /** MediaServer回傳license資料 */
  @ViewChild('onlineRegistration') onlineRegistration:OnlineRegistrationComponent;
  licenseInfo: ILicenseInfo;
  statistics: ILicenseStatistics[];
  currentEditorMode: ModalEditorModeEnum = ModalEditorModeEnum.NONE;
  licenseProduct = LicenseProduct;
  nvrConfigs: Nvr[];
  deviceConfigs: Device[];
  servers:ServerInfo[];
  currentServer:ServerInfo ;
  constructor(private coreService: CoreService, private licenseService: LicenseService, private parseService:ParseService) { }
  ServerType:{key:string, value:number}[] = [
    {key:"CMSManager", value:10},
    {key:"RecordServer", value:20},
    {key:"RecordRecoveryServer", value:30},
    {key:"RecordFailoverServer", value:40},
    {key:"SmartMedia", value:50}
  ];
  
  ngOnInit() {
    this.currentServer = new ServerInfo();
    this.currentServer.id="";

    Observable.combineLatest(
      this.parseService.fetchData({type:ServerInfo, 
        filter: query => query
        .notEqualTo("Type", "SmartMedia")
        .ascending("Type")        
        .limit(30000)
      }),
      this.coreService.getConfig({ path: this.coreService.urls.URL_CLASS_NVR }),
      this.coreService.getConfig({ path: this.coreService.urls.URL_CLASS_DEVICE }), // 當前已勾選Device資訊(參考用)
      (response1,response2, response3) => {        
        this.servers = [];
        for(let server of response1){
          let found = this.servers.find(x=>x.Domain == server.Domain);
          if(!found){
            this.servers.push(server);
          }
          else if(this.ServerType.find(x=>x.key == server.Type).value < this.ServerType.find(x=>x.key == found.Type).value){
            //replace according to the order
            found = Object.assign({}, server);
          }
        }
        this.currentServer = this.servers[0];
        this.nvrConfigs = response2.results;
        this.deviceConfigs = response3.results;
      }
    ).map(() => this.reloadLicenseInfo())
      .subscribe();
  }
  setCurrentServer(id:string){
    this.statistics=undefined;
    this.licenseInfo = undefined;
    this.currentServer = this.servers.find(x=>x.id == id);
    console.debug("this.currentServer",this.currentServer);
    this.reloadLicenseInfo();
    
  }
  reloadLicenseInfo() {
    const reload$ = this.coreService.proxyMediaServer({
      method: 'GET',
      path: this.coreService.urls.URL_MEDIA_LICENSE_INFO
    }, 5000, this.currentServer.id)
      .map(result => {
        this.licenseInfo = result.License;        
      })
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
      if(type.No !== "99999"){
        this.statistics.push({
          ProductNo: type.No,
          ProductType: type.Type,
          Description: type.Description,
          License: [],
          LicenseCount: 0,
          UsageCount: 0
        });
      }
    });
  }

  clickOnlineRegistration() {
    this.currentEditorMode = ModalEditorModeEnum.ONLINE_REGISTRATION;
    
    if(this.onlineRegistration){
      this.onlineRegistration.initEthernetCard();
    }
    
  }

  clickOfflineRegistration() {
    this.currentEditorMode = ModalEditorModeEnum.OFFLINE_REGISTRATION;
  }
}
