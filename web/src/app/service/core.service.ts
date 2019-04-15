import { Injectable } from '@angular/core';
// import * as Parse from 'parse';
import { CryptoService } from './crypto.service';
import { UserService } from './user.service';
import { Observable } from 'rxjs/Observable';
import { IPromise } from 'parse';
import { Http, Response, RequestOptions, Headers } from '@angular/http';
import { IBatchRequest } from 'lib/domain/core';

@Injectable()
export class CoreService {
  urls = urls; // 匯出讓其他使用CoreService的component能直接使用config
  /** 批次處理清單 */
  batchList: IBatchRequest[] = [];
  /** 通知CGI的內容清單 */
  notifyList: {
    objectId: string;
    path: string;
  }[] = [];
  /** ParseServer Header */
  parseHeaders = new Headers({
    'X-Parse-Application-Id': 'CMS3-Parse-API',
    'Content-Type': 'application/json'
  });

  /** 轉發MediaServer的Header */
  get mediaHeaders() {
    return new Headers({
      'Authorization': 'Basic ' + btoa(`${this.userService.storage['username']}:${this.userService.storage['password']}`),
      'Content-Type': 'text/xml'
    });
  }

  constructor(
    private http: Http,
    private cryptoService: CryptoService,
    private userService: UserService
  ) { }

  getConfig(args: { path: string, objectId?: string, query?: string, domainUrl?: string }) {
    let finalUrl = args.domainUrl
      ? args.domainUrl + args.path
      : Parse.serverURL + args.path;

    if (args.objectId) {
      finalUrl += '/' + args.objectId;
    }

    if (args.query) {
      finalUrl += args.query;
    }

    const options = new RequestOptions({ headers: this.parseHeaders });
    return this.http.get(finalUrl, options)
      .map((response: Response) => {
        const result = response.json();
        this.decrypt({ path: args.path, data: result });
        return result;
      });
  }

  /** Update */
  putConfig(args: { path: string, data: any }) {
    delete args.data.createdAt;
    delete args.data.updatedAt;
    const finalUrl = Parse.serverURL + args.path + '/' + (args.data.objectId || args.data.id);
    const options = new RequestOptions({ headers: this.parseHeaders });
    this.encrypt(args); // 送出前加密
    return this.http.put(finalUrl, JSON.stringify(args.data), options)
      .map((response: Response) => {
        this.notify({ path: args.path, objectId: args.data.objectId || args.data.id });
        return response.json();
      });
  }

  /** Create or Post-Read */
  postConfig(args: { path: string, data: any, notify?: boolean }) {
    const finalUrl = Parse.serverURL + args.path;
    const options = new RequestOptions({ headers: this.parseHeaders });
    this.encrypt(args); // 送出前加密
    return this.http.post(finalUrl, JSON.stringify(args.data), options)
      .map((response: Response) => {
        if (args.notify) {
          this.notify({ path: args.path, objectId: response.json().objectId });
        }
        return response.json();
      });
  }

  deleteConfig(args: { path: string, data: any }) {
    const finalUrl = Parse.serverURL + args.path + '/' + args.data.objectId;
    const options = new RequestOptions({ headers: this.parseHeaders });
    return this.http.delete(finalUrl, options)
      .map((response: Response) => {
        this.notify({ path: args.path, objectId: args.data.objectId });
        return response.json();
      });
  }

  proxyMediaServer(args: IBatchRequest, timeout?: number, serverId?:string) {
    const body = {
      method: args.method,
      path: args.path,
      domainPath: args.domainPath,
      headers: this.mediaHeaders,
      body: args.body
    };
    //console.debug("Parse.serverURL", Parse.serverURL);
    const options = new RequestOptions({ headers: this.parseHeaders });
    return this.http.post(Parse.serverURL + this.urls.MEDIA_PROXY_URL + (serverId ? `/${serverId}` : ""), body, options)
      .timeout(timeout || 10000)
      //.catch(err => Observable.throw(new Error(err.message)))
      .map((response: Response) => response.json());
  }

  /** 新增batch request */
  addBatch(args: IBatchRequest) {
    // 修改時內容不可有建立與修改時間
    if (args.method === 'PUT') {
      delete args.body.createdAt;
      delete args.body.updatedAt;
    }
    // 新增及修改時需加密
    if (args.method === 'POST' || args.method === 'PUT') {
      this.encrypt({ path: '' + args.path, data: args.body });
    }
    // 修改及刪除時從內容找出id放入url
    if (args.method === 'PUT' || args.method === 'DELETE') {
      this.addNotifyData({ path: '' + args.path, objectId: args.body.objectId || args.body.id });
      const id = args.body.objectId || args.body.id; // 可處理Http.Get及Parse.Object的資料
      if (id) {
        args.path = `${args.path}/${id}`;
      }
    }
    args.path = '/parse' + args.path;
    this.batchList.push(args);
  }

  /** 進行批次處理 */
  batch() {
    const item = { requests: this.batchList };
    return this.postConfig({ path: this.urls.URL_BATCH, data: item })
      .map((results) => {
        // Create請求必須先執行後才能加入notifyList
        for (let i = 0; i < this.batchList.length; i++) {
          if (this.batchList[i].method === 'POST' && results[i].success && results[i].success.objectId) {
            const id = results[i].success.objectId;
            this.addNotifyData({ path: this.batchList[i].path, objectId: id });
          }
        }
        this.notify();
        this.batchList = [];
        return results;
      });
  }

  /** 新增資料至notifyList */
  addNotifyData(args: { path: string, objectId?: string, dataArr?: any[] }) {
    if (args.objectId) {
      this.notifyList.push({
        objectId: args.objectId,
        path: args.path
      });
    }
    if (args.dataArr) {
      args.dataArr.forEach(data => {
        this.notifyList.push({
          objectId: data.id,
          path: args.path
        });
      });
    }
  }

  /** Call CGI通知CMS Client */
  notify(args?: { path: string, objectId: string }) {
    if (args) {
      this.addNotifyData(args);
    }
    if (this.notifyList && this.notifyList.length > 0) {      
        
        const body = Object.assign([], this.notifyList);        
        this.notifyList = [];
        setTimeout(() => { // 避免更新後notify速度太快導致讀到舊資料, 延遲1秒notify
          try{
          this.proxyMediaServer({
            method: 'POST',
            path: this.urls.URL_MEDIA_NOTIFY,
            body: {
              notify: body
            }
          }).toPromise();
        }catch(err){
          console.error("error from notification", err);
        }
        }, 2000);
    }
  }

  notifyWithParseResult(args: { parseResult: Parse.Object[], path: string }) {
    args.parseResult.forEach(data => {
      this.addNotifyData({
        path: args.path,
        objectId: data.id
      });
    });
    this.notify();
  }
  

  /** 返回指定長度的亂數字串 */
  randomString(len?: number): string {
    const base = 36, digit = len || 12;
    return Math.floor(Math.random() * Math.pow(base, digit)).toString(base);
  }

  /** 依照Path取得加解密欄位設定 */
  getCryptoAttribute(path: string): string[] {
    switch (path) {
      case this.urls.URL_CLASS_NVR: return this.cryptoService.cryptoAttributes.NVR;
      case this.urls.URL_CLASS_DEVICE: return this.cryptoService.cryptoAttributes.CAMERA;
      case this.urls.URL_CLASS_USER: return this.cryptoService.cryptoAttributes.USER;
      case this.urls.URL_CLASS_GENERAL: return this.cryptoService.cryptoAttributes.GENERAL;
      default: return undefined;
    }
  }

  /** 加密data指定欄位, 通常用在PUT, POST方法之前 */
  encrypt(args: { path: string, data: any }) {
    const attr = this.getCryptoAttribute(args.path);
    if (!attr) {
      return;
    }
    this.cryptoService.encryptAttr(args.data, attr);
  }

  /** 解密data指定欄位, 通常用在GET方法之後 */
  decrypt(args: { path: string, data: any }) {
    const attr = this.getCryptoAttribute(args.path);
    if (!attr) {
      return;
    }

    if (args.data.results) { // 多筆資料
      args.data.results.forEach(element => {
        this.cryptoService.decryptAttr(element, attr);
      });
    } else { // 單筆資料
      this.cryptoService.decryptAttr(args.data, attr);
    }
  }

  getLicenseResponseDescription(response: any) {
    switch (response) {
      case '-1': return 'Can\'t connect to registration server. (Error code: 1)';
      case '-2': return 'License key error. (Error: 2)';
      case '-3': return 'License key has been used. (Error code: 3)';
      case '-4': return 'License key has expired. (Erro coder: 4)';
      case '-5': return 'Can\'t find network card. (Error code: 5)';
      case '-6': return 'Can\'t update license file. (Error code: 6)';
      case '-7': return 'Registration failed. Please check Internet connection and registration key.';
      case '-8': return 'New adding license will be over 2000 limit, please check.';
      default: return '';
    }
  }

  /** 產生<a href="link">並自動點擊 */
  clickLink(args: { link: string, fileName?: string }) {
    const isSafariBrowser = navigator.userAgent.indexOf('Safari') > -1
      && navigator.userAgent.indexOf('Chrome') < 0;
    const dwldLink = document.createElement('a');
    if (isSafariBrowser) {
      dwldLink.setAttribute('target', '_blank');
    }

    dwldLink.setAttribute('href', args.link);
    if (args.fileName) {
      dwldLink.setAttribute('download', args.fileName);
    }
    dwldLink.style.visibility = 'hidden';
    document.body.appendChild(dwldLink);
    dwldLink.click();
    document.body.removeChild(dwldLink);
  }

  /** 將參數字串內的特殊字元取代掉, 使用在Nvr/Device Name */
  stripScript(s: string, replaceChar?: string) {
    const pattern = /[<>:"/\\|?*&']/gi;
    let rs = '';
    for (let i = 0; i < s.length; i++) {
      rs = rs + s.substr(i, 1).replace(pattern, replaceChar || '');
    }
    return rs;
  }

  /** 只保留字串中的數字並轉為number */
  setStringToNumber(s: string) {
    const pattern = /\D+?/gi;
    return Number(s.replace(pattern, ''));
  }

  /** 檢查n是否超過數字範圍並調整超出的部分 */
  inputNumberRange(args: { n: number, rangeLow: number, rangeHigh: number}) {
    if (args.n < args.rangeLow) {
      return args.rangeLow;
    }
    if (args.n > args.rangeHigh) {
      return args.rangeHigh;
    }
    return args.n;
  }
}


const urls = {
  URL_BATCH: '/batch',
  URL_CLASS_GENERAL: '/classes/General',
  URL_CLASS_NVR: '/classes/Nvr',
  URL_CLASS_SERVER: '/classes/Server',
  URL_CLASS_SERVERINFO: '/classes/ServerInfo',
  URL_CLASS_USER: '/classes/_User',
  URL_CLASS_USERGROUP: '/classes/UserGroup',
  URL_CLASS_DEVICE: '/classes/Device',
  URL_CLASS_DEVICEGROUP: '/classes/DeviceGroup',
  URL_CLASS_EVENTSCHEDULETEMPLATE: '/classes/EventScheduleTemplate',
  URL_CLASS_EVENTHANDLER: '/classes/EventHandler',
  URL_CLASS_EVENT: '/classes/Event',
  URL_CLASS_IOEVENTHANDLER: '/classes/IOEventHandler',
  URL_CLASS_SCHEDULE: '/classes/Schedule',
  URL_CLASS_RECORDSCHEDULETEMPLATE: '/classes/RecordScheduleTemplate',
  URL_CLASS_RECORDSCHEDULE: '/classes/RecordSchedule',
  URL_CLASS_GROUP: '/classes/Group',
  URL_CLASS_EVENTRECOVERY: '/classes/EventRecovery',
  URL_IPCAMERA_NVRID: '/cms/IPCameraNvrId',
  URL_RECORDPATH: '/classes/RecordPath',
  URL_BRAND_CAPABILITY: '/cms/BrandCapability',
  URL_SET_DBSYNC_DISABLE: '/cms/SetDBSyncDisable',

  MEDIA_PROXY_URL: '/proxy',
  URL_MEDIA_NOTIFY: '/cgi-bin/notify',
  URL_MEDIA_DISKSPACE: '/cgi-bin/diskspace',
  URL_MEDIA_SEARCH_DEVICE: '/cgi-bin/searchdevice',
  URL_MEDIA_SEARCH_CAMERA: '/cgi-bin/searchcamera',
  URL_MEDIA_GET_DEVICE_LIST: '/cgi-bin/nvrconfig?action=getdevicelistByXMLdata',
  URL_MEDIA_LICENSE_INFO: '/cgi-bin/sysconfig?action=licenseinfo',
  URL_MEDIA_ONLINE_REGISTRATION: '/cgi-bin/sysconfig?action=addlicensekey',
  URL_MEDIA_OFFLINE_REGISTRATION: '/cgi-bin/sysconfig?action=addlicensexml',
  URL_MEDIA_MANUAL_EVENT_LOG_RECOVERY: '/cgi-bin/nvrconfig?action=manualeventrecovery',
  URL_MEDIA_GET_SMART_AUTH: '/cgi-bin/smmconfig?action=getsmauth',
  URL_MEDIA_GET_P2P_AUTH: '/cgi-bin/smmconfig?action=getppauth',
  URL_MEDIA_NEW_EVENT: '/cgi-bin/sendevent', // wait for Rex
};
