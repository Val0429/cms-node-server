import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { IEventHandlerType } from 'lib/domain/core';
import { Nvr, Device, EventHandler } from 'app/model/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { EventService } from 'app/service/event.service';
import { EventConfigs, EventDisplaySetup } from 'app/config/event.config';
import { Observable } from 'rxjs/Observable';
import { StringHelper } from 'app/helper/string.helper';
import { JsonHelper } from 'app/helper/json.helper';
import { CameraService } from 'app/service/camera.service';
import { NvrService } from 'app/service/nvr.service';

@Component({
  selector: 'app-event-type-list',
  templateUrl: './event-type-list.component.html',
  styleUrls: ['./event-type-list.component.css']
})
export class EventTypeListComponent implements OnInit, OnChanges {
  @Input() currentDevice: Device;
  @Input() currentNVR:Nvr;
  @Input() currentEventHandler: EventHandler;
  @Output() reloadCallback: EventEmitter<any> = new EventEmitter();
  jsonHelper = JsonHelper.instance;
  /** 當前device可用的EventType集合 */
  availableEventTypeList: any[];
  /** 新增action的modal選項內容 */
  addActionOptions: { key: string, value: string }[];
  /** 準備新增的action */
  selectedAddAction = [];
  /** 目前操作(click)的EventHandler */
  currentClickedHandler: IEventHandlerType;
  nvrOptions: INvrOption[] = [];
  beepTimes: string[];
  beepDuration: { key: string, value: string }[];
  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private eventService: EventService,
    private cameraService:CameraService,
    private nvrService:NvrService
  ) { }

  ngOnInit() {
    this.addActionOptions = this.eventService.getEventActionTypeOptions({ hideUploadFTP: false });

    this.initBeepOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.debug("changes", changes);

    if (changes.currentDevice) {
      this.currentDevice = changes.currentDevice.currentValue;
    }
    if (changes.currentEventHandler) {
      this.currentEventHandler = changes.currentEventHandler.currentValue;
      this.getAvailableEventTypeList();
      this.buildFullEventHandlerConfig();
    }
  }

  /** 取得呈現於畫面上的EventHandler標題 */
  getEventHandlerTitle(handler: any): string {
    let result = this.eventService.getEventTypeDisplayText(handler.EventType);

    if (EventDisplaySetup.DisplayIdType.indexOf(handler.EventType) >= 0) {
      result = result + ' ' + handler.Id;
    }

    if (EventDisplaySetup.DisplayValueType.indexOf(handler.EventType) >= 0) {
      const value = handler.Value === '1' ? 'On' : 'Off';
      result = result + ' ' + value;
    }

    return result;
  }

  /** 建立共用的BeepOptions */
  initBeepOptions() {
    this.beepTimes = [];
    this.beepDuration = [];
    for (let i = 1; i < 11; i++) {
      this.beepTimes.push(i.toString());
      this.beepDuration.push({ key: `${i} sec`, value: i.toString() });
    }
  }

  streamMode:boolean=false;
  currentAction:any;
  selectedCallBack($event:any){    
    console.debug("$event", $event);
    this.currentAction.NvrId = $event.NvrId;
    this.currentAction.DeviceId = $event.DeviceId;
    this.currentAction.DigitalOutputId = $event.DigitalOutputId; 
  }
  cleanAction(){    
    this.currentAction = undefined;    
  }
  showDevice(action:any, streamMode:boolean=false){    
    this.streamMode=streamMode;
    this.currentAction = action;    
  }
  
  /** 依照device資料取得可設定的EventType List, 並於EventHandler物件中的EventHandler內放入多個EventType */
  getAvailableEventTypeList() {
    if (!this.currentDevice) {
      return;
    }
    // 重新整理本Device可用的EventType
    this.eventService.getDefaultEventHandling(this.currentDevice);
    this.availableEventTypeList = [];

    // 在getEventCondition中依照device的model判斷參數EventType是否新增入列表
    Object.keys(this.currentDevice.Capability || {}).forEach(key => {
      if (key.toLowerCase() === 'numberofmotion') {
        for (let i = 1; i <= Number(this.currentDevice.Capability[key]); i++) {
          this.insertFakeEventHandler(EventConfigs.EventType.Motion, i.toString());
        }
      }

      if (key.toLowerCase() === 'numberofdi') {
        for (let i = 1; i <= Number(this.currentDevice.Capability[key]); i++) {
          this.insertFakeEventHandler(EventConfigs.EventType.DigitalInput, i.toString(), true);
          this.insertFakeEventHandler(EventConfigs.EventType.DigitalInput, i.toString(), false);
        }
      }

      if (key.toLowerCase() === 'numberofdo') {
        for (let i = 1; i <= Number(this.currentDevice.Capability[key]); i++) {
          this.insertFakeEventHandler(EventConfigs.EventType.DigitalOutput, i.toString(), true);
          this.insertFakeEventHandler(EventConfigs.EventType.DigitalOutput, i.toString(), false);
        }
      }
    });

    //9200
    if(this.currentDevice.Config.Brand && this.currentDevice.Config.Brand.toUpperCase() === "AXIS" && this.currentDevice.Config.Model === "P8221"){            
      for (let i = 1; i <= 8; i++) {   
        this.insertFakeEventHandler(EventConfigs.EventType.DigitalInput, i.toString(), true, true);
        this.insertFakeEventHandler(EventConfigs.EventType.DigitalInput, i.toString(), false, true);
      }
    }
    // ISSUE: How to know SupportDO?

    // Issue: IOPort特殊狀況如何處理
    if (this.currentDevice.Config.Brand && this.currentDevice.Config.Brand.toUpperCase() === 'AXIS') {
      for (let i = 1; i <= 6; i++) {
        this.insertFakeEventHandler(EventConfigs.EventType.TemperatureDetection, i.toString(), true);
      }
    }
    // 以下為無條件都有的Type
    this.insertFakeEventHandler(EventConfigs.EventType.VideoLoss);
    this.insertFakeEventHandler(EventConfigs.EventType.VideoRecovery);
    this.insertFakeEventHandler(EventConfigs.EventType.NetworkLoss);
    this.insertFakeEventHandler(EventConfigs.EventType.NetworkRecovery);
    this.insertFakeEventHandler(EventConfigs.EventType.Panic);
    this.insertFakeEventHandler(EventConfigs.EventType.CrossLine);

    // 新版追加的部分
    this.insertFakeEventHandler(EventConfigs.EventType.AbandonedObject);
    this.insertFakeEventHandler(EventConfigs.EventType.MissingObject);

    this.insertFakeEventHandler(EventConfigs.EventType.ZoneCrossing);
    this.insertFakeEventHandler(EventConfigs.EventType.ConditionalZoneCrossing);

    this.insertFakeEventHandler(EventConfigs.EventType.PIR);

    this.insertFakeEventHandler(EventConfigs.EventType.RecordResume);
    this.insertFakeEventHandler(EventConfigs.EventType.RecordStop);

    this.insertFakeEventHandler(EventConfigs.EventType.SDCardError);
    this.insertFakeEventHandler(EventConfigs.EventType.SDCardFull);

    this.insertFakeEventHandler(EventConfigs.EventType.IntrusionDetection);
    this.insertFakeEventHandler(EventConfigs.EventType.LoiteringDetection);
    this.insertFakeEventHandler(EventConfigs.EventType.ObjectCountingIn);
    this.insertFakeEventHandler(EventConfigs.EventType.ObjectCountingOut);

    this.insertFakeEventHandler(EventConfigs.EventType.AudioDetection);
    this.insertFakeEventHandler(EventConfigs.EventType.TamperDetection);

    this.insertFakeEventHandler(EventConfigs.EventType.FDBRecovery);

    this.insertFakeEventHandler(EventConfigs.EventType.VideoStart);
    this.insertFakeEventHandler(EventConfigs.EventType.VideoStop);

    // ISSUE: EnableUserDefine如何判定?
  }

  insertFakeEventHandler(eventType: string, id: string = '1', value: boolean = true, forcePush:boolean = false) {
    const availableObj = this.eventService.getCameraEvent({ Type: eventType, Id: id, Value: value });
    
      const val = (availableObj ? availableObj.Value : value) ? '1' : '0';
      const insertObj = {
        EventType: eventType,
        Id: id,
        Value: val,
        Trigger: '1',
        Interval: '1',
        Action: []
      };

      if(availableObj || forcePush) this.availableEventTypeList.push(insertObj);    
  }

  // 將EventHandler Config加入所有可用的EventType
  buildFullEventHandlerConfig() {
    if (!this.currentEventHandler || !this.availableEventTypeList) {
      return;
    }
    const tempEventHandler = [];
    this.availableEventTypeList.forEach(element => {
      // 檢查現有資料是否有該type
      const originData = this.currentEventHandler.EventHandler.find(x => x.EventType === element.EventType
        && x.Id === element.Id && x.Value === element.Value);
      if (!originData) {
        tempEventHandler.push(element);
      } else {
        tempEventHandler.push(originData);
      }
    });
    this.currentEventHandler.EventHandler = tempEventHandler;
  }
   

  /** 點擊新增EventHaneler */
  clickAddAction(handler: any) {
    this.currentClickedHandler = handler;
    this.selectedAddAction = [];
  }

  checkAddAction(option: string) {
    console.debug("option", option);
    const index = this.selectedAddAction.indexOf(option);
    if (index >= 0) {
      this.selectedAddAction.splice(index, 1);
    } else {
      this.selectedAddAction.push(option);
    }
  }

  clickSaveAddAction() {
    if (this.selectedAddAction.length === 0) {
      return;
    }
    // 檢查哪些選項被勾選並新增至currentEventHandler
    this.addActionOptions.forEach(element => {
      if (this.selectedAddAction.indexOf(element.value) >= 0) {
        const newAction = this.getNewAction(element.value);
        console.debug("newAction", newAction);
        if (newAction) {
          this.addNewAction(newAction);
        }
      }
    });
  }

  getNewAction(actionType: string) {
    switch (actionType) {
      case EventConfigs.EventActionType.DigitalOut:
        return {
          Type: actionType,
          NvrId: '',
          DeviceId: '',
          DigitalOutputId: '', // StreamId
          Status: '1' // ISSUE: 規則不明確
        };
      case EventConfigs.EventActionType.SendMail:
        return {
          Type: actionType,
          Recipient: '',
          Subject: `${this.currentDevice.Channel} ${this.currentDevice.Name} - `
            + `${this.currentClickedHandler.EventType} ${this.currentClickedHandler.Id}`,
          Body: `${this.currentDevice.Channel} ${this.currentDevice.Name} - `
            + `${this.currentClickedHandler.EventType} ${this.currentClickedHandler.Id} (Server ${this.currentNVR.Domain})`,
          Attach: 'true', // boolean: true/false
          NvrId: '',
          DeviceId: '',
        };
      case EventConfigs.EventActionType.UploadFTP:
        return {
          Type: actionType,
          NvrId: '',
          DeviceId: '',
          FileName: `${this.currentDevice.Channel} ${this.currentDevice.Name}`,
          Timestamp: 'true'
        };
      case EventConfigs.EventActionType.Beep:
        return {
          Type: actionType,
          Times: '1',
          Duration: '1',
          Interval: '1'
        };
      case EventConfigs.EventActionType.Audio:
      case EventConfigs.EventActionType.ExecCmd:
        return {
          Type: actionType,
          FileName: ''
        };
      case EventConfigs.EventActionType.PopupLive:
      case EventConfigs.EventActionType.PopupPlayback:
      case EventConfigs.EventActionType.HotSpot:
        return {
          Type: actionType,
          NvrId: '',
          DeviceId: '',
        };
    }
    return null;
  }

  addNewAction(newAction: any) {
    if (!this.currentClickedHandler) {
      return;
    }
    this.currentClickedHandler.Action.push(newAction);
  }

  clickDeleteAction(list: any[], action: any) {
    if (confirm('Are you sure to delete this action?')) {
      const index = list.indexOf(action);
      if (index >= 0) {
        list.splice(index, 1);
      }
    } else {
      return;
    }
  }

  clickSaveConfig() {
    // 檢查EventHandler, 若其Action內不含任何資料, 就刪除此EventHandler不儲存
    for (let i = 0; i < this.currentEventHandler.EventHandler.length; ) {
      if (this.currentEventHandler.EventHandler[i].Action.length === 0) {
        this.currentEventHandler.EventHandler.splice(i, 1);
      } else {
        if (Number(this.currentEventHandler.EventHandler[i].Interval) < 0) {
          this.currentEventHandler.EventHandler[i].Interval = '0';
        }
        i++;
      }
    }
    console.debug("this.currentEventHandler",this.currentEventHandler);
    let task = Observable.of(null);
    if (this.currentEventHandler.EventHandler.length > 0) { // EventHandler有資料時儲存
      task = Observable.fromPromise(this.currentEventHandler.save());
    } else { // EventHandler沒有資料時, 若此物件已存在DB則需刪除
      if (this.currentEventHandler.id) {
        task = Observable.fromPromise(this.currentEventHandler.destroy());
      }
    }
    task
      .map(result => {
        if (result) {
          this.coreService.notifyWithParseResult({
            parseResult: [result], path: this.coreService.urls.URL_CLASS_EVENTHANDLER
          });
        }
      })
      .toPromise()
      .then(() => {
        this.reloadCallback.emit();
        this.currentDevice = undefined;
        this.currentEventHandler = undefined;
        alert('Update Success.');
      })
      .catch(alert);
  }

}

interface INvrOption {
  key: string; // Name
  value: string; // NvrId
  data: Nvr;
  devices: IDeviceOption[];
}

interface IDeviceOption {
  key: string; // Channel + Name
  value: number; // Channel
  data: Device;
}
