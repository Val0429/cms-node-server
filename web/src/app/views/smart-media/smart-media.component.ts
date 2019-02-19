import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalDirective } from 'ngx-bootstrap';
import { IPageViewerOptions } from 'app/shared/components/page-viewer/page-viewer.component';
import { Device, Nvr } from 'app/model/core';
import { ParseService } from 'app/service/parse.service';
import { Observable } from 'rxjs/Observable';
import { CoreService } from 'app/service/core.service';
import { CryptoService } from 'app/service/crypto.service';
import { LicenseService } from 'app/service/license.service';
import * as QRCode from 'qrcode';
import { DomSanitizer } from '@angular/platform-browser';
import { CameraService } from 'app/service/camera.service';

@Component({
  selector: 'app-smart-media',
  templateUrl: './smart-media.component.html',
  styleUrls: ['./smart-media.component.css']
})
export class SmartMediaComponent implements OnInit {
  @ViewChild('editModal') editModal: ModalDirective;
  dataList: Device[];
  /** 暫存目前編輯資料 */
  currentEditData: Device;
  /** 畫面上可編輯項目 */
  editDataModel: ISmartMediaEditModel = {};
  pageViewerOptions: IPageViewerOptions;

  queryParams: {
    page?: number,
    channel?: number
  } = {};

  /** Driver = SmartMedia的Nvr */
  smartMediaNvr: Nvr;
  /** 轉換後的QRCode base64 */
  currentQRCode: {
    device: Device,
    base64: string
  };
  smartMediaModelList = ['Smart Patrol Service', 'Smart Monitor Service'];
  flag = {
    save: false,
    editDefault: false // 編輯畫面等待處理預設資料
  };

  constructor(
    private router: Router,
    private coreService: CoreService,
    private parseService: ParseService,
    private cryptoService: CryptoService,
    private activatedRoute: ActivatedRoute,
    private licenseService: LicenseService,
    private cameraService:CameraService,
    protected domSanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.fetchRouteQueryParams()
      .switchMap(() => this.getNvrForSmartMedia())
      .switchMap(() => this.fetchDataList())
      .subscribe();
  }

  /** 取得路由參數 */
  fetchRouteQueryParams() {
    const queryParams$ = this.activatedRoute.queryParams
      .do(queryParams => {
        Object.assign(this.queryParams, queryParams);
        // number類型條件另外處理
        ['page', 'channel']
          .forEach(key => this.queryParams[key] = +this.queryParams[key] || 0);
      });
    return queryParams$;
  }

  /** 取得DataList */
  fetchDataList() {
    this.dataList = undefined;

    // 分頁器選項
    const options: IPageViewerOptions = {
      currentPage: this.queryParams.page || 1,
      pageVisibleSize: 10,
      itemVisibleSize: 10,
      itemCount: 0
    };

    // 查詢條件
    const filter = (query: Parse.Query<Device>) => {
      query.equalTo('NvrId', this.smartMediaNvr.Id);
      if (this.queryParams.channel && this.queryParams.channel !== 0) {
        query.equalTo('Channel', this.queryParams.channel);
      }
      query.ascending('Channel');
    };

    // 取得分頁資料
    const fetch$ = Observable.fromPromise(this.parseService.fetchPagingAndCount({
      type: Device,
      currentPage: options.currentPage,
      itemVisibleSize: options.itemVisibleSize,
      filter: filter
    })).do(result => {
      options.itemCount = result.count;
      this.pageViewerOptions = options;
      result.data.forEach(device => {
        device.Config.Authentication.Account = this.cryptoService.decrypt4DB(device.Config.Authentication.Account);
        device.Config.Authentication.Password = this.cryptoService.decrypt4DB(device.Config.Authentication.Password);
      });
      this.dataList = result.data;

      if (this.dataList.length === 0 && options.currentPage > 1) {
        this.pageChange(options.currentPage - 1);
      }
    });

    return fetch$;
  }

  /** 頁碼變更 */
  pageChange(pageNumber?: number) {
    const queryParams = Object.assign({}, this.queryParams);
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
        delete queryParams[key];
      }
    });

    queryParams.page = pageNumber || 1;
    this.router.navigate(['/smart-media'], { queryParams: queryParams });
  }

  /** 清除搜尋 */
  clearSearch() {
    Object.keys(this.queryParams)
      .forEach(key => delete this.queryParams[key]);
    this.pageChange();
  }

  clickSave() {
    // 檢查輸入欄位
    if (!this.editDataModel.model) {
      this.editDataModel.model = this.smartMediaModelList[0];
    }
    if (!this.editDataModel.name || !this.editDataModel.account || !this.editDataModel.password) {
      alert('Please check your input.');
      return;
    }

    let lic;
    switch (this.editDataModel.model) {
      case this.smartMediaModelList[0]: lic = '00169'; break;
      case this.smartMediaModelList[1]: lic = '00170'; break;
    }

    if (!lic) {
      alert('Model is not available for Smart Media.');
      return;
    }

    this.flag.save = true;

    this.licenseService.getLicenseAvailableCount(lic)
      .map(num => {
        if ((!this.currentEditData && num < 1) // 新增的狀況, 可用的license必須至少1
          || (this.currentEditData && num < 0)) { // 修改的狀況, 可用的license若為負數就不可修改
          alert('License available count is not enough, can not save data.');
          return;
        }
        this.saveEditData();
      })
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  saveEditData() {

    const obj = this.currentEditData || new Device();

    if (!this.currentEditData) {
      obj.NvrId = this.smartMediaNvr.Id;
      obj.Channel = this.editDataModel.channelId;
    }

    obj.Name = this.coreService.stripScript(this.editDataModel.name);

    obj.Config = {
      Brand: 'iSapSolution',
      Model: this.editDataModel.model,
      Authentication: {
        Account: this.cryptoService.encrypt4DB(this.editDataModel.account),
        Password: this.cryptoService.encrypt4DB(this.editDataModel.password),
        Encryption: 'BASIC',
        OccupancyPriority: this.editDataModel.firstLogin ? 1 : 0
      },
      Stream: [
        {
          Id: 1,
          Video: {
            ResolutionScale: '',
            Encode: '',
            Width: 0,
            Height: 0,
            Fps: 0,
            Bitrate: 0,
            ChannelId: 0
          },
          Port: {}
        }
      ]
    };

    const saveData$ = Observable.fromPromise(obj.save())
      .map(device => this.coreService.notifyWithParseResult({
        parseResult: [device], path: this.coreService.urls.URL_CLASS_DEVICE
      }));

    saveData$
      .map(() => {
        this.editModal.hide();
        this.editDataModel = {};
      })
      .switchMap(() => this.fetchDataList())
      .toPromise()
      .catch(alert);
  }

  async remove(data: Device) {
    if (!data || !confirm('Are you sure to delete this Smart Media?')) {
      return;
    }
    try{      
      
      await this.cameraService.deleteCam([data.id], this.smartMediaNvr.id);      
      alert('Delete Success');
      
    }catch(err){
      console.error(err);
      alert(err);            
    }finally{
      this.fetchDataList().toPromise();
    }
  }

  /** 在點擊Create之後設定畫面上的預設資料 */
  async setCreateData() {
    this.flag.editDefault = true;
    await this.getNewChannelId()
      .then(id => {
        this.editDataModel = {
          channelId: id,
          model: this.smartMediaModelList[0]
        };
        this.currentEditData = undefined;
        this.flag.editDefault = false
      })            
  }

  /** 取得欲編輯的FRSPersonGroup資料 */
  setEditData(data: Device) {
    this.currentEditData = data;
    this.editDataModel = {
      channelId: data.Channel,
      model: data.Config.Model,
      name: data.Name,
      account: data.Config.Authentication.Account,
      password: data.Config.Authentication.Password,
      firstLogin: data.Config.Authentication.OccupancyPriority === 1 ? true : false
    };
  }

  getNvrForSmartMedia() {
    const getNvr$ = Observable.fromPromise(this.parseService.getData({
      type: Nvr,
      filter: query => query.matches('Driver', new RegExp('SmartMedia'), 'i')
    }).then(nvr => {
      this.smartMediaNvr = nvr;
    }));
    return getNvr$;
  }

  /** 依照DB目前內容，取得適當ChannelId */
  async getNewChannelId() {
    let channels = await this.cameraService.getNewChannel(this.smartMediaNvr.Id, 1);
    return channels.length>0?channels[0]:0;
  }

  /** Call cgi 下載key file */
  clickDownloadAuth(data: Device) {
    // window.open(this.getSmartMediaAuthURL(data));
    const path = this.getSmartMediaAuthURL(data);
    this.coreService.clickLink({ link: path.domain + path.url });
  }

  /**  */
  clickGenerateQRCode(data: Device) {
    const path = this.getSmartMediaAuthURL(data);
    this.coreService.proxyMediaServer({
      method: 'GET',
      path: path.url,
      domainPath: path.domain
    }).map(result => {
      QRCode.toDataURL(result)
        .then(base64Url => {
          this.currentQRCode = {
            device: data,
            base64: base64Url
          };
        })
        .catch(console.error);
    })
      .toPromise()
      .catch(alert);
  }

  /** 組出Smart Auth並嘗試Get該CGI */
  getSmartMediaAuthURL(data: Device): ISmartMediaAuthPath {
    if (!this.smartMediaNvr) {
      return { domain: '', url: '' };
    }

    const host = this.smartMediaNvr.Domain.toLowerCase() === 'localhost'
      ? this.parseService.host : this.smartMediaNvr.Domain;

    const authPath = `http://${host}:${this.smartMediaNvr.Port}`;
    const path = `${this.coreService.urls.URL_MEDIA_GET_SMART_AUTH}&channel=channel${data.Channel}`;
    return { domain: authPath, url: path };
  }
}

interface ISmartMediaEditModel {
  channelId?: number;
  /** 表明此裝置是Smart Patrol or Smart Monitor */
  model?: string;
  name?: string;
  account?: string;
  password?: string;
  firstLogin?: boolean;
}

interface ISmartMediaAuthPath {
  domain: string;
  url: string;
}
