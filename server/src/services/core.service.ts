import { IBatchRequest } from "lib/domain/core";
import { ConfigHelper } from "../helpers";
import { Observable } from "rxjs";

var request = require('request-promise');
const configHelper = ConfigHelper.instance;

export class CoreService {
  static get instance() {
    return this._instance || (this._instance = new this());
  }

private static _instance: CoreService;

  auth:string;
  urls = urls; 
  /** 通知CGI的內容清單 */
  notifyList: {
    objectId: string;
    path: string;
  }[] = [];
  
  

  constructor(
  ) { }

  
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
  mediaHeaders(auth:string) {
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'text/xml'
    };
  }
  proxyMediaServer(args: IBatchRequest, timeout?: number):Observable<any> {    
    
    const body = {
      method: args.method,
      path: args.path,
      domainPath: args.domainPath,
      headers: this.mediaHeaders(this.auth),
      body: args.body
    };
    let bodyString = JSON.stringify(body);
    //console.debug("Parse.serverURL", Parse.serverURL);
    let parseHeaders = {
      'X-Parse-Application-Id': 'CMS3-Parse-API',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyString)
    };;

    let protocol = configHelper.parseConfig.IS_HTTPS ? 'https' : 'http';
    let hostname = configHelper.parseConfig.HOST;
    let port = configHelper.parseConfig.IS_HTTPS ? configHelper.parseConfig.SSL_PORT : configHelper.parseConfig.PORT;
    let path = 'parse'+ this.urls.MEDIA_PROXY_URL;    

    const options = {
      uri: `${protocol}://${hostname}:${port}/${path}`,
      headers: parseHeaders,
      method: 'POST',
      body,
      json: true
    };
    
    return Observable.fromPromise(request(options).then(function (parsedBody) {        
      return parsedBody;
      })
      .catch(function (err) {
        console.log("error media server", err);
        return err;
      }));
  }
  /** Call CGI通知CMS Client */
  notify(args?: { path: string, objectId: string }) {
    if (args) {
      this.addNotifyData(args);
    }
    if (this.notifyList && this.notifyList.length > 0) {      
        const body = Object.assign([], this.notifyList);
        this.notifyList = [];        
        setTimeout(async ()=> {
        try{
          await this.proxyMediaServer({            
            method: 'POST',
            path: this.urls.URL_MEDIA_NOTIFY,
            body: {
              notify: body
            }
          }).toPromise();
        }catch(err){
          console.error("error from notification:", err);
        }
      }, 2000);
    }
  }
  notifyWithParseResult(args: { parseResult: Parse.Object[], path: string }) {
    this.addNotifyWithParseResult(args);
    this.notify();
  }
  
  addNotifyWithParseResult(args: { parseResult: Parse.Object[], path: string }) {
    args.parseResult.forEach(data => {
      this.addNotifyData({
        path: args.path,
        objectId: data.id
      });
    });    
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
  URL_LOG: '/cms/SysLog',
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
