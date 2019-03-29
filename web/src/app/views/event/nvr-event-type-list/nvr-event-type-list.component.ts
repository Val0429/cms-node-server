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

@Component({
  selector: 'app-nvr-event-type-list',
  templateUrl: './nvr-event-type-list.component.html',
  styleUrls: ['./nvr-event-type-list.component.css']
})
export class NvrEventTypeListComponent implements OnInit, OnChanges {
  @Input() currentNVR: Nvr;
  @Input() currentEventHandler: EventHandler;
  @Output() reloadCallback: EventEmitter<any> = new EventEmitter();
  jsonHelper = JsonHelper.instance;
  /** 當前nvr可用的EventType集合 */
  availableEventTypeList: any[];
  /** 新增action的modal選項內容 */
  addActionOptions: { key: string, value: string }[];
  /** 準備新增的action */
  selectedAddAction = [];
  /** 目前操作(click)的EventHandler */
  currentClickedHandler: IEventHandlerType;
  
  beepTimes: string[];
  beepDuration: { key: string, value: string }[];
  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private eventService: EventService
  ) { }

  ngOnInit() {
    this.addActionOptions = this.eventService.getEventActionTypeOptions({ hideUploadFTP: true });    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentNVR) {
      console.debug("this.currentNVR",this.currentNVR);
      this.currentNVR = changes.currentNVR.currentValue;
    }
    if (changes.currentEventHandler) {
      this.currentEventHandler = changes.currentEventHandler.currentValue;
      this.getAvailableEventTypeList();
      this.buildFullEventHandlerConfig();
    }
  }

 

  getEventHandlerTitle(handler: any): string {
    let result = handler.EventType;

    if (EventDisplaySetup.DisplayIdType.indexOf(handler.EventType) >= 0) {
      result = result + ' ' + handler.Id;
    }

    if (EventDisplaySetup.DisplayValueType.indexOf(handler.EventType) >= 0) {
      const value = handler.Value === '1' ? 'On' : 'Off';
      result = result + ' ' + value;
    }

    return result;
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
  initBeepOptions() {
    this.beepTimes = [];
    this.beepDuration = [];
    for (let i = 1; i < 11; i++) {
      this.beepTimes.push(i.toString());
      this.beepDuration.push({ key: `${i} sec`, value: i.toString() });
    }
  }

  

  
  /** 取得可設定的EventType List, 並於fake EventHandler物件中的EventHandler內放入多個EventType */
  getAvailableEventTypeList() {
    if (!this.currentNVR) {
      return;
    }

    this.availableEventTypeList = [];
    this.eventService.getDefaultIOEventHandling();   

    // 以下為無條件都有的Type
    this.insertFakeEventHandler(EventConfigs.EventType.LocalDiskError);
    this.insertFakeEventHandler(EventConfigs.EventType.StorageSettingNotAvailable);
    this.insertFakeEventHandler(EventConfigs.EventType.NVRConnect);
    this.insertFakeEventHandler(EventConfigs.EventType.NVRDisconnect);
    this.insertFakeEventHandler(EventConfigs.EventType.UnauthorizedAccess);
    this.insertFakeEventHandler(EventConfigs.EventType.Reboot);
    this.insertFakeEventHandler(EventConfigs.EventType.GracefulShutdown);
    this.insertFakeEventHandler(EventConfigs.EventType.AbnormalShutdown);
  }

  /** 從eventService中已知的availableEventType中，判斷參數條件是否允許新增 */
  insertFakeEventHandler(eventType: string, id?: string, value?: boolean) {
    const availableObj = this.eventService.getCameraEvent({ Type: eventType, Id: id, Value: value });
    if (availableObj) {
      const val = availableObj.Value ? '1' : '0'; // On or Off
      const insertObj = {
        EventType: eventType,
        Id: id,
        Value: val,
        Trigger: '1',
        Interval: '1',
        AlarmName: id ? this.eventService.getIOEventDefaultAlarmName(id) : undefined, // IO event專屬欄位
        Action: []
      };
      this.availableEventTypeList.push(insertObj);
    }
  }

  /** 將EventHandler Config加入所有可用的EventType, 使畫面呈現時顯示所有類型 */
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
        tempEventHandler.push(Object.assign({}, element));
      } else {
        tempEventHandler.push(originData);
      }
    });
    this.currentEventHandler.EventHandler = tempEventHandler;
  }

  /** 設定DeviceId時, 將選項轉換為數字再放入action */
  setDeviceId($event: any, action: any) {
    action.DeviceId = Number($event.target.value);
  }

  clickAddAction(handler: any) {
    this.currentClickedHandler = handler;
    this.selectedAddAction = [];
  }

  checkAddAction(option: string) {
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
          DigitalOutputId: '',
          Status: '1'
        };
      case EventConfigs.EventActionType.SendMail:
        return {
          Type: actionType,
          Recipient: '',
          // {NvrId} {NvrName} - {EventType} {EventId}
          Subject: `${this.currentNVR.Id} ${this.currentNVR.Name} - `
            + `${this.currentClickedHandler.EventType} ${this.currentClickedHandler.Id}`,
          // {NvrId} {NvrName} - {EventType} {EventId} (Server {Nvr.IP})
          Body: `${this.currentNVR.Id} ${this.currentNVR.Name} - `
            + `${this.currentClickedHandler.EventType} ${this.currentClickedHandler.Id} (Server ${this.currentNVR.Domain})`,
          Attach: 'false', // boolean: true/false
          NvrId: '',
          DeviceId: '',
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
    return undefined;
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
        this.currentNVR = undefined;
        this.currentEventHandler = undefined;
        alert('Update Success.');
      })
      .catch(alert);
  }
}
