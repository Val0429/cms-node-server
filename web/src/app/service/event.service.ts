import { Injectable } from '@angular/core';
import { EventConfigs } from '../config/event.config';
import { CameraEvent, ICameraEvent } from '../model/camera-event';
import OptionHelper from 'app/helper/option.helper';

@Injectable()
export class EventService {
  availableEventType: CameraEvent[];
  constructor() { }

  getDefaultEventHandling(device: any) {
    this.availableEventType = [];
    console.debug("device.Config", device.Config);
    const modelManufacture = device.Config.Brand ? device.Config.Brand.toLowerCase() : "";
    const modelType = device.Capability && device.Capability.CapabilityType ? device.Capability.CapabilityType : "";

    if (modelManufacture === 'isapsolution' && modelType === 'smartmonitorservice') {
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.UsbAttach }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.UsbDetach }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.UsbCopyFile }));
    } else {
      switch (modelManufacture) {
        case 'isapsolution':
        case 'onvif':
        case 'kedacom':
        case 'customization':
          break;
        default:
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.NetworkLoss }));
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.NetworkRecovery }));
          break;
      }

      switch (modelManufacture) {
        case 'vivotek':
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.PIR }));
          break;
        case 'brickcom':
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.CrossLine }));
          break;
        case 'bosch':
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.CrossLine }));
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.AbandonedObject }));
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.MissingObject }));
          break;
        case 'axis':
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.CrossLine }));
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.ZoneCrossing }));
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.ConditionalZoneCrossing }));
          break;
        case 'dynacolor':
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.SDCardError }));
          this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.SDCardFull }));
          break;
        // case 'Certis':
        // if (modelSeries === 'HIKVISION') {
        //   result.push(new CameraEvent({ Type: EventConfigs.EventType.SDCardError }));
        //   result.push(new CameraEvent({ Type: EventConfigs.EventType.SDCardFull }));
        // }
        // break;
      }

      Object.keys(device.Capability || {}).forEach(key => {
        if (key.toLowerCase() === 'numberofmotion') {
          for (let i = 1; i <= Number(device.Capability[key]); i++) {
            this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.Motion, Id: i.toString() }));
          }
        }

        if (key.toLowerCase() === 'numberofdi') {
          for (let i = 1; i <= Number(device.Capability[key]); i++) {
            this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.DigitalInput, Id: i.toString(), Value: true }));
            this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.DigitalInput, Id: i.toString(), Value: false }));
          }
        }

        if (key.toLowerCase() === 'numberofdo') {
          for (let i = 1; i <= Number(device.Capability[key]); i++) {
            this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.DigitalOutput, Id: i.toString(), Value: true }));
            this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.DigitalOutput, Id: i.toString(), Value: false }));
          }
        }
      });

      for (let i = 1; i <= 6; i++) {
        this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.TemperatureDetection, Id: i.toString(), Value: true }));
      }

      if (modelType === 'VideoServer') {
        this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.VideoLoss }));
        this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.VideoRecovery }));
      }

      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.UserDefine }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.Panic }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.IntrusionDetection }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LoiteringDetection }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.ObjectCountingIn }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.ObjectCountingOut }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.AudioDetection }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.TamperDetection }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.VideoStart }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.VideoStop }));

      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_0 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_1 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_2 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_3 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_4 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_5 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_6 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_7 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_8 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_9 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_10 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_11 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_12 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_13 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_14 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDION_15 }));

      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_0 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_1 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_2 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_3 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_4 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_5 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_6 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_7 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_8 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_9 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_10 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_11 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_12 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_13 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_14 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDIOFF_15 }));

      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_0 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_1 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_2 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_3 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_4 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_5 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_6 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_7 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_8 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_9 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_10 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_11 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_12 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_13 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_14 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOON_15 }));

      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_0 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_1 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_2 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_3 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_4 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_5 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_6 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_7 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_8 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_9 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_10 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_11 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_12 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_13 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_14 }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDOOFF_15 }));

      for (let i = 1; i <= 16; i++) {
        this.availableEventType.push(new CameraEvent(
          { Type: EventConfigs.EventType.EmbeddedDigitalInput, Id: i.toString(), Value: true }));
        this.availableEventType.push(new CameraEvent(
          { Type: EventConfigs.EventType.EmbeddedDigitalInput, Id: i.toString(), Value: false }));
        this.availableEventType.push(new CameraEvent(
          { Type: EventConfigs.EventType.EmbeddedDigitalOutput, Id: i.toString(), Value: true }));
        this.availableEventType.push(new CameraEvent(
          { Type: EventConfigs.EventType.EmbeddedDigitalOutput, Id: i.toString(), Value: false }));
      }

      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDiskError }));

      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.RecordResume }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.RecordStop }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.NVRConnect }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.NVRDisconnect }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.StorageSettingNotAvailable }));
    }
  }

  getDefaultIOEventHandling() {
    this.availableEventType = [];

    for (let i = 8; i <= 12; i++) {
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.DigitalInput, Id: i.toString(), Value: true }));
      this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.DigitalInput, Id: i.toString(), Value: false }));
    }
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.LocalDiskError }));
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.StorageSettingNotAvailable }));
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.NVRConnect }));
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.NVRDisconnect }));
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.IllegalLogin }));
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.Reboot }));
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.Shutdown }));
    this.availableEventType.push(new CameraEvent({ Type: EventConfigs.EventType.AbnormalShutdown }));
  }

  getCameraEvent(obj: ICameraEvent) {
    let result = this.availableEventType.filter(x => x.Type === obj.Type);
    if (obj.Id) {
      result = result.filter(x => x.Id === obj.Id);
    }
    if (obj.Value !== undefined) {
      result = result.filter(x => x.Value === obj.Value);
    }
    return result.length > 0 ? result[0] : null;
  }

  /** 取得Event Action Type選單, 參數可用來調整Event及I/O Event所需清單差異 */
  getEventActionTypeOptions(args: { hideUploadFTP: boolean }) {
    let options = OptionHelper.getOptions(EventConfigs.EventActionType);
    if (args.hideUploadFTP) {
      options = options.filter(x => x.key.toLowerCase() !== 'uploadftp');
    }
    return options;
  }

  /** 取得EventType顯示於畫面上的名稱 */
  getEventTypeDisplayText(type: string): string {
    switch (type) {
      case EventConfigs.EventType.Panic: return 'PanicButton';
      default: return type;
    }
  }

  /** 取得EventActionType顯示在畫面上的名稱, call by UI */
  getEventActionTypeDisplayText(typeName: string) {
    switch (typeName) {
      case EventConfigs.EventActionType.DigitalOut: return 'Trigger DO';
      case EventConfigs.EventActionType.SendMail: return 'Send Mail';
      case EventConfigs.EventActionType.UploadFTP: return 'FTP Upload';
      case EventConfigs.EventActionType.Beep: return 'Beep';
      case EventConfigs.EventActionType.Audio: return 'Audio';
      case EventConfigs.EventActionType.ExecCmd: return 'Execute Command';
      case EventConfigs.EventActionType.PopupLive: return 'Popup Live';
      case EventConfigs.EventActionType.PopupPlayback: return 'Popup Playback';
      case EventConfigs.EventActionType.HotSpot: return 'Hotspot';
    }
    return '';
  }

  /** I/O Event的AlarmName預設值 */
  getIOEventDefaultAlarmName(eventId: string) {
    switch (eventId) {
      case '8': return 'Heat Sensor';
      case '9': return 'Rack Tamper Alarm';
      case '10': return 'UPS Battery Low';
      case '11': return 'A/C Failure';
      case '12': return 'Water Sensor';
      default: return '';
    }
  }
}
