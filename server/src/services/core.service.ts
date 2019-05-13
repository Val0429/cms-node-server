import { IBatchRequest } from "lib/domain/core";
import { ConfigHelper } from "../helpers";

var request = require('request-promise');
const configHelper = ConfigHelper.instance;


export class CoreService {
  static get instance() {
    return this._instance || (this._instance = new this());
  }

private static _instance: CoreService;
  auth:string;
  urls = urls; 

  constructor(
  ) { 
    this.sendNotifications();
  }

  
  /** 新增資料至notifyList */
  
  mediaHeaders(auth:string) {
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'text/xml'
    };
  }
  async proxyMediaServer(args: IBatchRequest):Promise<any> {    
    
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
    
    let isHttps=configHelper.parseConfig.IS_HTTPS && configHelper.parseConfig.SSL_PORT;
    let protocol = isHttps ? 'https' : 'http';    
    let port = isHttps? configHelper.parseConfig.SSL_PORT : configHelper.parseConfig.PORT;
    let hostname = configHelper.parseConfig.HOST;
    let path = 'parse'+ this.urls.MEDIA_PROXY_URL;    

    const options = {
      uri: `${protocol}://${hostname}:${port}/${path}`,
      headers: parseHeaders,
      method: 'POST',
      body,
      json: true
    };

    return await request(options)
      .catch(err=>{
        console.error("error from proxy server", err.message ? err.message : err);
      });
  }

  /** Call CGI通知CMS Client */
  async notify(body:NotificationBody[], immediate?:boolean) {
    if(!body || body.length<=0) return;    
    
    if(immediate===true){      
      await this.proxyMediaServer({            
        method: 'POST',
        path: this.urls.URL_MEDIA_NOTIFY,
        body: {
          notify: body
        }
      });
    }else{
      this.notifications.push({body});
    }
  }
 
  notifications=[];
  //check and send notification every 1 second to prevent media server overwhelmed by too many requests
  sendNotifications(){
    setInterval(async ()=>{
      if(this.notifications.length==0)return;
      
      let data = this.notifications.splice(0, 1);
      
      await this.proxyMediaServer({            
        method: 'POST',
        path: this.urls.URL_MEDIA_NOTIFY,
        body: {
          notify: data[0].body
        }
      });      
    }, 1000)
  }
}

export interface NotificationBody{path: string, objectId: string };

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
