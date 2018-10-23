import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { Observable } from 'rxjs/Observable';
import { WeekScheduleOptions } from 'app/config/week-scheduler.config';
import { OptionHelper } from 'app/helper/option.helper';

@Component({
  selector: 'app-nvr-device-selector',
  templateUrl: './nvr-device-selector.component.html',
  styleUrls: ['./nvr-device-selector.component.css']
})
export class NvrDeviceSelectorComponent implements OnInit, OnChanges {
  @Input() updateLatest: boolean; // 單純的reload flag
  @Output() selectDeviceEvent: EventEmitter<any> = new EventEmitter();
  weekScheduleOptions: any; // plan選項
  scheduleConfigs: any; // 所有schedule設定資料
  nvrConfigs: any;
  deviceConfigs: any;
  showedNvrId: string;
  selectedDevice: any;
  constructor(private coreService: CoreService) { }

  ngOnInit() {
    Observable.combineLatest(
      this.coreService.getConfig({path: this.coreService.urls.URL_CLASS_NVR}), // 當前已新增NVR資訊(參考用)
      this.coreService.getConfig({path: this.coreService.urls.URL_CLASS_DEVICE}), // 當前已勾選Device資訊(參考用)
      this.coreService.getConfig({path: this.coreService.urls.URL_CLASS_SCHEDULE}),
      (response1, response2, response3) => {
        this.nvrConfigs = response1.results;
        this.deviceConfigs = response2.results;
        this.scheduleConfigs = response3.results;
      }
    ).subscribe();
    this.weekScheduleOptions = OptionHelper.getOptions(WeekScheduleOptions); // 取得plan選項物件
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.updateLatest) { // 當此屬性變化時即reload資料，不論true/false
      this.reloadScheduleData();
    }
  }

  reloadScheduleData() {
    this.coreService.getConfig({path: this.coreService.urls.URL_CLASS_SCHEDULE})
    .map(result => this.scheduleConfigs = result.results)
    .subscribe();
  }

  getDevicesByNvr(nvr: any) {
    if (this.deviceConfigs) {
      const result = this.deviceConfigs.filter(x => x.NvrId === nvr.Id)
      .sort(function (a, b) {
        return (Number(a.Channel) > Number(b.Channel) ? 1 : (Number(b.Channel) > Number(a.Channel) ? -1 : 0));
      });
      if (result.length === 0) {
        return null;
      }
      return result;
    } else {
      return null;
    }
  }

  // 從所有設定中找出針對特定Device的Schedule
  findScheduleConfig(device: any) {
    const scheduleConfig = this.scheduleConfigs.find(x => x.NvrId === device.NvrId && x.DeviceId === device.Channel);
    if (!scheduleConfig) {
      return null;
    } else {
      return scheduleConfig;
    }
  }

  getPlanName(device: any) {
    const scheduleConfig = this.findScheduleConfig(device);
    if (!scheduleConfig) {
      return 'Full Time';
    }
    const plan = this.weekScheduleOptions.find(x => x.value === scheduleConfig.Schedule);
    if (!plan) {
      return 'User-defined Schedule';
    }
    return plan.key;
  }

  // 取得錄影秒數設定 PreRecord
  getPreRecordSetting(device: any) {
    const scheduleConfig = this.findScheduleConfig(device);
    if (!scheduleConfig) {
      return '5'; // default 5 sec.
    }
    return scheduleConfig.PreRecord;
  }

  // 取得錄影秒數設定 PostRecord
  getPostRecordSetting(device: any) {
    const scheduleConfig = this.findScheduleConfig(device);
    if (!scheduleConfig) {
      return '30'; // default 30 sec.
    }
    return scheduleConfig.PostRecord;
  }

  // 點擊Device，並回傳給母Component
  clickDevice(device: any) {
    this.selectedDevice = device;
    this.selectDeviceEvent.emit(device);
  }

  clickNvr(nvr: any) {
    this.showedNvrId = this.showedNvrId === nvr.objectId ? '' : nvr.objectId;
  }
}
