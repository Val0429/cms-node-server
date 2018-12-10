import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Select2OptionData } from 'ng2-select2/ng2-select2';
import * as js2xmlparser from 'js2xmlparser';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { LicenseService } from 'app/service/license.service';
import { Device, Nvr, Group, RecordSchedule, ServerInfo, EventHandler } from 'app/model/core';
import { IDeviceStream } from 'lib/domain/core';
import { GroupService } from 'app/service/group.service';
import { ModalEditorModeEnum } from 'app/shared/enum/modalEditorModeEnum';
import { NvrManufacturer } from 'app/config/nvr-manufacturer.config';
import ArrayHelper from 'app/helper/array.helper';
import JsonHelper from 'app/helper/json.helper';
import { CameraService } from 'app/service/camera.service';

@Component({
  selector: 'app-nvr-editor',
  templateUrl: './nvr-editor.component.html',
  styleUrls: ['./nvr-editor.component.css']
})
export class NvrEditorComponent implements OnInit, OnChanges {

  /** 傳入ParseObject Nvr物件 */
  @Input() editNvr: Nvr;
  @Output() reloadDataEvent: EventEmitter<any> = new EventEmitter();
  /** 目前編輯的NVR Model資料 */
  currentEditModel: INvrEditModel;
  /** Manufacture選項清單 */
  manufactureOptions = NvrManufacturer.EditorList;
  /** 所有group資料 */
  groupList: Group[];
  /** group群組化選項物件 */
  groupOptions: Select2OptionData[];
  displayDevices: { device: Device, checked: boolean }[]; // 顯示用的Device列表
  /** DB中NvrId=目前Nvr的Device */
  selectedDevices: Device[];
  tempDevices: Device[]; // 透過Get Device List取得該NVR所有裝置清單，提供user選擇
  /** 顯示Get Device狀態的文字 */
  devicesStatusString = '';

  iSapP2PServerList: ServerInfo[];
  flag = {
    save: false,
    delete: false,
    load: false
  };

  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private groupService: GroupService,
    private cryptoService: CryptoService,
    private licenseService: LicenseService,
    private cameraService:CameraService
  ) { }

  ngOnInit() {
    const getGroup$ = Observable.fromPromise(this.parseService.fetchData({
      type: Group,
      filter: query => query.limit(30000)
    }).then(groups => {
      this.groupList = groups;
      this.groupOptions = this.groupService.getGroupOptions(this.groupList);
      this.reloadEditData();
    }));

    const getServerInfo$ = Observable.fromPromise(this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query.matches('Type', new RegExp('SmartMedia'), 'i')
    }).then(serverInfos => this.iSapP2PServerList = serverInfos));

    getGroup$
      .switchMap(() => getServerInfo$)
      .subscribe();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.editNvr) {
      this.editNvr = changes.editNvr.currentValue;
      this.reloadEditData();
    }
  }

  /** 取得editModel及此Nvr相關Device */
  reloadEditData() {
    if (!this.editNvr) {
      return;
    }

    this.setEditModel();

    this.parseService.fetchData({
      type: Device,
      filter: query => query
        .equalTo('NvrId', this.editNvr.Id)
        .ascending('Channel')
        .limit(30000)
    }).then(devices => {
      this.selectedDevices = devices;
      this.refreshDeviceList();
    });
  }

  /** 將editNvr內容套用至編輯Model */
  setEditModel() {
    // iSapP2P專用屬性
    const serverInfo = this.iSapP2PServerList.find(data =>
      data.Domain === this.editNvr.Domain && data.Port === this.editNvr.Port);

    // 獨立屬性Group
    const group = this.groupList.find(data => data.Nvr && data.Nvr.indexOf(this.editNvr.Id) >= 0);

    this.currentEditModel = {
      Name: this.editNvr.Name,
      Manufacture: this.editNvr.Manufacture,
      Domain: this.editNvr.Domain,
      Port: this.editNvr.Port,
      ServerPort: this.editNvr.ServerPort,
      Account: this.cryptoService.decrypt4DB(this.editNvr.Account),
      Password: this.cryptoService.decrypt4DB(this.editNvr.Password),
      Tags: this.editNvr.Tags ? this.editNvr.Tags.join(',') : '',
      IsListenEvent: this.editNvr.IsListenEvent,
      IsPatrolInclude: this.editNvr.IsPatrolInclude,
      SSLEnable: this.editNvr.SSLEnable,
      Group: group ? group.id : undefined,
      ServerId: serverInfo ? serverInfo.id : undefined
    };
  }

  /** 將編輯Model內容套用至editNvr */
  getEditModel() {
    this.editNvr.Name = this.coreService.stripScript(this.currentEditModel.Name);
    this.editNvr.Manufacture = this.currentEditModel.Manufacture;
    this.editNvr.Driver = this.getNvrDriverByManufacture();
    this.editNvr.Domain = this.currentEditModel.Domain;
    this.editNvr.Port = this.currentEditModel.Port;
    this.editNvr.ServerPort = this.currentEditModel.ServerPort;
    this.editNvr.Account = this.cryptoService.encrypt4DB(this.currentEditModel.Account);
    this.editNvr.Password = this.cryptoService.encrypt4DB(this.currentEditModel.Password);
    this.editNvr.IsListenEvent = this.currentEditModel.IsListenEvent;
    this.editNvr.IsPatrolInclude = this.currentEditModel.IsPatrolInclude;
    this.editNvr.SSLEnable = this.currentEditModel.SSLEnable;
  }

  /** 重新整理顯示出的DeviceList */
  refreshDeviceList() {
    this.displayDevices = [];
    if (!this.tempDevices) { // 尚未取得最新DeviceList前，只顯示先前有勾選的Device
      this.displayDevices = this.selectedDevices.map(dev => {
        return { device: dev, checked: true };
      });
    } else { // 已點擊過GetDeviceList則顯示tempDevice
      this.displayDevices = this.tempDevices.map(dev => {
        return { device: dev, checked: this.selectedDevices.some(x => x.Channel === dev.Channel) };
      });
    }

    this.devicesStatusString = this.displayDevices.length === 0
      ? 'No device selected or available.' : '';

    this.checkAllDeviceSelected();
  }

  /** 檢查目前Device List是否全部勾選 */
  checkAllDeviceSelected() {
    return !this.displayDevices.some(x => x.checked === false);
  }

  /** 點擊DeviceList全部勾選的動作 */
  setAllDeviceSelected() {
    const newValue = !this.checkAllDeviceSelected();
    this.displayDevices.forEach(item => {
      item.checked = newValue;
    });
  }
  getCompaneName(companyKey:string):string{
    return this.cameraService.getBrandDisplay(companyKey);
  }

  ipRegex=new RegExp(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/);
  
  domainRegex = new RegExp(/^(([a-zA-Z]{1})|([a-zA-Z]{1}[a-zA-Z]{1})|([a-zA-Z]{1}[0-9]{1})|([0-9]{1}[a-zA-Z]{1})|([a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9]))\.([a-zA-Z]{2,6}|[a-zA-Z0-9-]{2,30}\.[a-zA-Z]{2,3})$/);
  clickSave() {
    console.debug("ip valid", this.ipRegex.test(this.currentEditModel.Domain));
    console.debug("domain valid", this.domainRegex.test(this.currentEditModel.Domain));
    let testDomain =  this.domainRegex.test(this.currentEditModel.Domain) ||
                      this.ipRegex.test(this.currentEditModel.Domain) || 
                      this.currentEditModel.Domain=="localhost";

    console.debug(this.currentEditModel.Domain);
    if(!testDomain){
      alert('invalid domain!')
      return;
    }

    this.flag.save = true;

    this.saveNvr()
      .switchMap(() => this.saveDevices())
      .map(() => {
        this.tempDevices = undefined;
        this.reloadAfterSave();
        alert('Update Success');
      })
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  saveNvr() {
    
    this.editNvr.Tags = this.currentEditModel.Tags.split(',');
    this.getEditModel();

    const setId$ = this.getNewNvrId()
      .map(newId => this.editNvr.Id = newId);

    return setId$
      .switchMap(() => Observable.fromPromise(this.editNvr.save())
        .map(result => this.coreService.notifyWithParseResult({
          parseResult: [result], path: this.coreService.urls.URL_CLASS_NVR
        })))
      .switchMap(() => this.groupService.setNvrGroup(this.editNvr.Id, this.currentEditModel.Group));
  }

  saveCurrentNvr() {
    const save$ = Observable.fromPromise(this.editNvr.save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_NVR
      }));
    const updateGroup$ = this.groupService.setNvrGroup(this.editNvr.Id, this.currentEditModel.Group);

    return save$
      .switchMap(() => updateGroup$)
      .switchMap(() => this.saveDevices());
  }

  /** 取得所有Nvr並找出適當NvrId */
  getNewNvrId() {
    if (this.editNvr.Id) {
      return Observable.of(this.editNvr.Id);
    }
    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query
        .select('Id')
        .limit(30000)
    })).map(nvrs => {
      nvrs.sort(function (a, b) {
        return (Number(a.Id) > Number(b.Id)) ? 1 : ((Number(b.Id) > Number(a.Id)) ? -1 : 0);
      });
      let result = 1;
      nvrs.forEach(nvr => {
        if (result === Number(nvr.Id)) {
          result++;
        } else {
          return;
        }
      });
      return result.toString();
    });
    return get$;
  }

  clickDelete() {
    if (confirm('Are you sure to delete this NVR?')) {
      const deleteSchedule$ = Observable.fromPromise(this.parseService.fetchData({
        type: RecordSchedule,
        filter: query => query.equalTo('NvrId', this.editNvr.Id)
      }))
        .switchMap(data => Observable.fromPromise(Parse.Object.destroyAll(data)))
        .map(result => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_RECORDSCHEDULE, dataArr: result }));

      const deleteEventHandler$ = Observable.fromPromise(this.parseService.fetchData({
        type: EventHandler,
        filter: query => query.equalTo('NvrId', this.editNvr.Id)
      }))
        .switchMap(data => Observable.fromPromise(Parse.Object.destroyAll(data)))
        .map(result => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_EVENTHANDLER, dataArr: result }));

      const deleteDevice$ = Observable.fromPromise(Parse.Object.destroyAll(this.selectedDevices))
        .map(result => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_DEVICE, dataArr: result }));

      const deleteNvr$ = Observable.fromPromise(this.editNvr.destroy())
        .map(result => this.coreService.notifyWithParseResult({
          parseResult: [result], path: this.coreService.urls.URL_CLASS_NVR
        }));

      const deleteGroupNvr$ = this.groupService.removeNvr(this.editNvr.Id);

      this.flag.delete = true;

      deleteSchedule$
        .switchMap(() => deleteEventHandler$)
        .switchMap(() => deleteDevice$)
        .switchMap(() => deleteNvr$)
        .switchMap(() => deleteGroupNvr$)
        .map(() => {
          alert('Delete Success');
          this.reloadAfterSave();
        })
        .toPromise()
        .catch(alert)
        .then(() => this.flag.delete = false);
    } else {
      return;
    }
  }

  reloadAfterSave() {
    this.reloadDataEvent.emit();
    this.editNvr = undefined;
    this.currentEditModel = undefined;
    this.tempDevices = undefined;
  }

  /** 增修刪Device */
  saveDevices() {
    let saveList: Device[] = [];
    let deleteList: Device[] = [];

    const hasClickedGetDevice = this.tempDevices ? true : false;

    if (hasClickedGetDevice) { // 有點擊過GetDeviceList，刪除所有舊資料，並新增打勾項目
      deleteList = deleteList.concat(this.selectedDevices);
      saveList = saveList.concat(this.displayDevices.filter(item => item.checked).map(item => item.device));
    } else { // 沒點擊過GetDeviceList，刪除被取消勾選的資料
      deleteList = deleteList.concat(this.displayDevices.filter(item => !item.checked).map(item => item.device));
    }

    // 依照Manufacutre判斷license可用數量，決定DeviceList是否可儲存
    const lic = this.licenseService.getNvrManufacturerLicenseCode(this.currentEditModel.Manufacture);

    return this.licenseService.getLicenseAvailableCount(lic)
      .switchMap(num => {
        if (num < (saveList.length - deleteList.length)) {
          alert('License available count is not enough, did not save device list.');
          return Observable.of(null);
        } else {
          // 儲存新勾選的Device並加入Notify
          const save$ = Observable.fromPromise(Parse.Object.saveAll(saveList))
            .map(devices => {
              this.coreService.addNotifyData({
                path: this.coreService.urls.URL_CLASS_DEVICE,
                dataArr: saveList
              });
            });
          // 刪除舊的或取消勾選的Device並加入Notify
          const delete$ = Observable.fromPromise(Parse.Object.destroyAll(deleteList))
            .map(devices => {
              this.coreService.addNotifyData({
                path: this.coreService.urls.URL_CLASS_DEVICE,
                dataArr: deleteList
              });
            });

          // 找出deleteList中不存在於saveList的Channel，並刪除其recordSchedule
          const recordScheduleDeleteList = deleteList.filter(x => !saveList.some(y => y.Channel === x.Channel));
          const removeRecordSchedule$ = Observable.fromPromise(this.parseService.fetchData({
            type: RecordSchedule,
            filter: query => query
              .equalTo('NvrId', this.editNvr.Id)
              .containedIn('ChannelId', recordScheduleDeleteList.map(x => x.Channel))
          }))
            .switchMap(schedules => {
              return Observable.fromPromise(Parse.Object.destroyAll(schedules))
                .map(results => this.coreService.notifyWithParseResult({
                  parseResult: results, path: this.coreService.urls.URL_CLASS_RECORDSCHEDULE
                }));
            });

          return save$
            .switchMap(() => delete$)
            .switchMap(() => removeRecordSchedule$);
        }
      });
  }

  /** 從MediaServer取得目前可選的Devices，轉換格式後取代displayDevices */
  clickGetDeviceList() {
    this.saveNvr()
      .map(() => {
        this.reloadEditData();
        this.getDeviceList();
      })
      .subscribe();
  }
  
  
  /** 轉發CGI取得該NVR的Device */
  getDeviceList() {
    if (!this.tempDevices) {
      this.tempDevices = [];
    }

    this.flag.load = true;

    const get$ = this.coreService.proxyMediaServer({
      method: 'GET',
      path: `${this.coreService.urls.URL_MEDIA_GET_DEVICE_LIST}&nvr=nvr${this.editNvr.Id}`,
      body: {}
    }, 30000)
      .map(result => {
        const deviceConnect = JsonHelper.instance.findAttributeByString(result, 'AllDevices.DeviceConnectorConfiguration');
        this.tempDevices = this.convertTempToDisplay(deviceConnect);
        this.refreshDeviceList();
      });

    get$
      .toPromise()
      .catch(alert)
      .then(() => this.flag.load = false);
  }

  /** 將media server來的tempDevice轉為CMS儲存格式 */
  convertTempToDisplay(arr: any): Device[] {
    if (!arr) {
      return [];
    }

    const tempList: Device[] = [];
    const processList = ArrayHelper.toArray(arr);

    processList.forEach(dev => {
      try {
        this.convertTempDeviceFormat(dev);
        const newObj = new Device({
          NvrId: this.editNvr.Id,
          Name: dev.DeviceSetting.Name,
          Channel: Number(dev.DeviceID),
          Config: dev.DeviceSetting,
          Capability: dev.Capability
        });

        newObj.Config.Stream.forEach(str => {
          str.Id = Number(str.Id);
        });
        tempList.push(newObj);
      } catch (err) {
        return;
      }
    });

    return tempList;
  }

  /** 從MediaServer取得tempDevice後，由於與儲存格式名稱不同，需先轉換方便後續作業 */
  convertTempDeviceFormat(dev: any) {
    dev.DeviceSetting.Stream = this.convertStreamConfig(dev.DeviceSetting.StreamConfig);
    delete dev.DeviceSetting.StreamConfig;
    dev.DeviceSetting['Multi-Stream'] = this.convertMultiStream(dev.DeviceSetting['Multi-Stream']);
  }

  /** 將MediaServer上的Stream資料格式轉換為CMS儲存格式 */
  convertStreamConfig(stream: any) {
    const results = [];
    if (!stream) {
      return results;
    }
    stream = ArrayHelper.toArray(stream);

    stream.forEach(str => {
      const newItem: IDeviceStream = {
        Id: Number(str.$.id),
        Video: str.Video,
        Port: {}
      };
      results.push(newItem);
    });
    return results;
  }

  /** 將MediaServer上的MultiStream資料格式轉換為CMS儲存格式 */
  convertMultiStream(multiStream: any) {
    return {
      High: multiStream ? multiStream.HighProfile : undefined,
      Medium: multiStream ? multiStream.MediumProfile : undefined,
      Low: multiStream ? multiStream.LowProfile : undefined
    };
  }

  /** 設定Manufacturer時轉換並儲存字串到NvrConfig */
  onChangeManufacture() {
    // this.editNvr.Driver = this.getNvrDriverByManufacture();
    // iSapP2P會隱藏帳號密碼改由亂數產生
    if (this.currentEditModel.Manufacture === 'iSapP2P') {
      this.currentEditModel.Account = this.coreService.randomString(12);
      this.currentEditModel.Password = this.coreService.randomString(12);
    }
  }

  /** 依照Manufacture決定Driver value */
  getNvrDriverByManufacture() {
    switch (this.currentEditModel.Manufacture.toLowerCase()) {
      case 'isap failover server': return 'iSap';
      case 'milestone corporate 2016 r2': return 'MilestoneCorporate';
      case 'acti enterprise': return 'ACTi_E';
      case 'diviotec (linux)':
      case 'diviotec (windows)': return 'Diviotec';
      default: return this.currentEditModel.Manufacture;
    }
  }

  /** 套用Server的Domain, Port至CurrentEditModel的同名資料 */
  onChangeServer() {
    const serverInfo = this.iSapP2PServerList.find(data => data.id === this.currentEditModel.ServerId);
    if (serverInfo) {
      this.currentEditModel.Domain = serverInfo.Domain;
      this.currentEditModel.Port = serverInfo.Port;
    }
  }

  /** Get Device List之前將Driver替換內容 */
  // replacePostDataDriver(driver: string) {
  //   let result = driver;
  //   switch (driver) {
  //     case 'ACTi Enterprise':
  //       result = 'ACTi_E';
  //       break;
  //     case 'Diviotec (Windows)':
  //     case '3TSmart':
  //     case 'Siemens':
  //     case 'Certis':
  //     case 'Dynacolor':
  //     case 'Customization':
  //       result = 'iSap';
  //       break;
  //     case 'Diviotec (Linux)':
  //       result = 'Diviotec';
  //       break;
  //   }
  //   return result;
  // }

  /** 先儲存Nvr再取得PPAuth檔案 */
  clickGetAuthFile() {
    this.flag.load = true;
    this.saveNvr()
      .map(() => {
        this.reloadEditData();
        const host = `http://${this.currentEditModel.Domain}:${this.currentEditModel.Port}`;
        const path = `${this.coreService.urls.URL_MEDIA_GET_P2P_AUTH}&nvr=nvr${this.editNvr.Id}`;
        window.open(host + path);
        // this.coreService.clickLink({ link: host + path });
      })
      .toPromise()
      .catch(alert)
      .then(() => this.flag.load = false);
  }
}

interface INvrEditModel {
  Name: string;
  Manufacture: string;
  Domain: string;
  Port: number;
  ServerPort: number;
  Account: string;
  Password: string;
  Tags: string;
  IsListenEvent: boolean;
  IsPatrolInclude: boolean;
  SSLEnable: boolean;
  /** NVR所屬Group, 不屬於Nvr增儲存資料, 需另外處理 */
  Group?: string;
  /** iSapP2P專用: 選擇ServerInfo中type=SmartMedia的資料 */
  ServerId?: string;
}

interface IDisplayDevice {
  device: Device;
  checked: boolean;
}
