import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Select2OptionData } from 'ng2-select2/ng2-select2';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
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
  p:number=1;
  @Input()pageSize:number;
  /** 目前編輯的NVR Model資料 */
  currentEditModel: INvrEditModel;
  /** Manufacture選項清單 */
  manufactureOptions = NvrManufacturer.EditorList;
  /** 所有group資料 */
  noGroup:Group;
  @Input() groupList: Group[];
  /** group群組化選項物件 */
  groupOptions: Select2OptionData[];
  displayDevices: { device: Device, checked: boolean }[]; // 顯示用的Device列表
  /** DB中NvrId=目前Nvr的Device */
  selectedDevices: Device[];
  tempDevices: Device[]; // 透過Get Device List取得該NVR所有裝置清單，提供user選擇
  /** 顯示Get Device狀態的文字 */
  devicesStatusString = '';

  @Input() iSapP2PServerList: ServerInfo[];
  @Input() flag :{
    busy: boolean
  };

  ipRegex=new RegExp(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/);  
  domainRegex = new RegExp(/^(([a-zA-Z]{1})|([a-zA-Z]{1}[a-zA-Z]{1})|([a-zA-Z]{1}[0-9]{1})|([0-9]{1}[a-zA-Z]{1})|([a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9]))\.([a-zA-Z]{2,6}|[a-zA-Z0-9-]{2,30}\.[a-zA-Z]{2,3})$/);
  
  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private groupService: GroupService,
    private licenseService: LicenseService,
    private cameraService:CameraService,
    private nvrService:NvrService
  ) { }

  async ngOnInit() {
    
    this.noGroup = this.groupList.find(x=>x.Name=="Non Main Group");
    this.groupOptions = this.groupService.getGroupOptions(this.groupList);
    
  }
  async ngOnChanges(changes: SimpleChanges) {
    if (changes.editNvr) {
      this.editNvr = changes.editNvr.currentValue;
      await this.reloadEditData();
    }
  }

  /** 取得editModel及此Nvr相關Device */
  async reloadEditData(newGroupId?:string) {
    if (!this.editNvr) {
      return;
    }
    this.p=1;
    this.currentEditModel = this.nvrService.setEditModel(this.editNvr, this.groupList, this.iSapP2PServerList, newGroupId);
    
    await this.cameraService.getDevice(this.editNvr.Id, 1, Number.MAX_SAFE_INTEGER)
      .then(devices => {
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

  
  async clickSave() {
    try{
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
    
      this.flag.busy = true;      
      
      this.nvrService.getEditModel(this.editNvr, this.currentEditModel);
      await Promise.all([
        this.nvrService.saveNvr([this.editNvr], this.currentEditModel.Group),
        this.saveDevices()
      ]);
      this.tempDevices = undefined;
      this.reloadAfterSave();
      alert('Update Success');
    }
    catch(err){
      alert(err);
      console.error(err);
    }
    finally{
      this.flag.busy = false;
    }
  }

  async clickDelete() {
    if (!confirm('Are you sure to delete this NVR?')) return;

    try{
      this.flag.busy = true;
      await this.nvrService.deleteNvr([this.editNvr.id]);
      alert("Delete Success");
      this.reloadAfterSave();
    } catch(err){
      console.error(err);
      alert(err);
    }finally{
      this.flag.busy = false;
    }
  }

  reloadAfterSave() {    
    this.editNvr = undefined;
    this.currentEditModel = undefined;
    this.tempDevices = undefined;
    this.reloadDataEvent.emit();
  }

  /** 增修刪Device */
  async saveDevices() {
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

    let num = await this.licenseService.getLicenseAvailableCount(lic).toPromise();
      
      if (num < (saveList.length - deleteList.length)) {
        alert('License available count is not enough, did not save device list.');
        return Observable.of(null);
      } 
      // 儲存新勾選的Device並加入Notify
      const save$ = this.cameraService.saveCamera(saveList, this.editNvr, undefined, "");
      // 刪除舊的或取消勾選的Device並加入Notify
      const delete$ = this.cameraService.deleteCam(deleteList.map(e=>e.id), this.editNvr.id);

      await Observable.forkJoin(save$, delete$).toPromise();
  }

  /** 從MediaServer取得目前可選的Devices，轉換格式後取代displayDevices */
  async clickGetDeviceList() {
    this.nvrService.getEditModel(this.editNvr, this.currentEditModel);
    if(!this.editNvr.Id || !this.editNvr.id){
      await this.nvrService.saveNvr([this.editNvr], this.currentEditModel.Group)
        .then(async results => {          
          this.editNvr = await this.parseService.getDataById({type:Nvr, objectId:results[0].objectId});              
        });
    }
    await this.reloadEditData(this.currentEditModel.Group);
    await this.getDeviceList();
  }
  
  
  /** 轉發CGI取得該NVR的Device */
  async getDeviceList() {
    if (!this.tempDevices) {
      this.tempDevices = [];
    }

    this.flag.busy = true;

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

    await get$
      .toPromise()
      .catch(alert)
      .then(() => this.flag.busy = false);
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

  /** 套用Server的Domain, Port至CurrentEditModel的同名資料 */
  onChangeServer() {
    const serverInfo = this.iSapP2PServerList.find(data => data.id === this.currentEditModel.ServerId);
    if (serverInfo) {
      this.currentEditModel.Domain = serverInfo.Domain;
      this.currentEditModel.Port = serverInfo.Port;
    }
  }

  /** 先儲存Nvr再取得PPAuth檔案 */
  async clickGetAuthFile() {
    try{
        this.flag.busy = true;
        this.nvrService.getEditModel(this.editNvr, this.currentEditModel);
        if(!this.editNvr.Id){
          await this.nvrService.saveNvr([this.editNvr], this.currentEditModel.Group)
          .then(async results => {          
            this.editNvr = await this.parseService.getDataById({type:Nvr, objectId:results[0].objectId});          
          });
        }    
        await this.reloadEditData(this.currentEditModel.Group);
        const host = `http://${this.currentEditModel.Domain}:${this.currentEditModel.Port}`;
        const path = `${this.coreService.urls.URL_MEDIA_GET_P2P_AUTH}&nvr=nvr${this.editNvr.Id}`;
        window.open(host + path);
        // this.coreService.clickLink({ link: host + path });
    }
    catch(err){
      alert(err);
      console.error(err);
    }
    finally{
      this.flag.busy = false
    }
  }
}



