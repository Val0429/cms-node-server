import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Select2OptionData } from 'ng2-select2/ng2-select2';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { LicenseService } from 'app/service/license.service';
import { Device, Nvr, Group, RecordSchedule, ServerInfo } from 'app/model/core';
import { IDeviceStream } from 'lib/domain/core';
import { GroupService } from 'app/service/group.service';
import { NvrManufacturer } from 'app/config/nvr-manufacturer.config';
import ArrayHelper from 'app/helper/array.helper';
import JsonHelper from 'app/helper/json.helper';
import { CameraService } from 'app/service/camera.service';
import { NvrService, INvrEditModel } from 'app/service/nvr.service';

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
    private cameraService:CameraService,
    private nvrService:NvrService
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

    this.currentEditModel = this.nvrService.setEditModel(this.editNvr, this.groupList, this.iSapP2PServerList);

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

    this.nvrService.saveNvr(this.editNvr, this.currentEditModel)
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

  async clickDelete() {
    if (!confirm('Are you sure to delete this NVR?')) return;

    try{
      this.flag.delete = true;
      await this.nvrService.deleteNvr(this.editNvr);
      alert("Delete Success");
      this.reloadAfterSave();
    } catch(err){
      console.error(err);
      alert(err);
    }finally{
      this.flag.delete = false;
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
            .map(() => {
                this.coreService.addNotifyData({
                  path: this.coreService.urls.URL_CLASS_DEVICE,
                  dataArr: saveList
                });
              });
          // 刪除舊的或取消勾選的Device並加入Notify
          const delete$ = Observable.fromPromise(Parse.Object.destroyAll(deleteList))
            .map(() => {
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
    this.nvrService.saveNvr(this.editNvr, this.currentEditModel)
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
    if (this.currentEditModel.Manufacture === 'iSAPP2P') {
      this.currentEditModel.Account = this.coreService.randomString(12);
      this.currentEditModel.Password = this.coreService.randomString(12);
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
  //       result = 'iSAP';
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
    this.nvrService.saveNvr(this.editNvr, this.currentEditModel)
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



