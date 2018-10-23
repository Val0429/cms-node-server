import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { EventService } from 'app/service/event.service';
import { Observable } from 'rxjs/Observable';
import { Nvr, Device, Event } from 'app/model/core';
import { EventDisplaySetup } from 'app/config/event.config';
import * as moment from 'moment';
import { timestamp } from 'rxjs/operator/timestamp';

@Component({
  selector: 'app-event-generator',
  templateUrl: './event-generator.component.html',
  styleUrls: ['./event-generator.component.css']
})
export class EventGeneratorComponent implements OnInit {
  /** 產生Event時的條件 */
  currentData: {
    nvrId?: string,
    channelId?: number,
    deviceId?: number,
    date?: string, // ex: 2018-05-05 與time合用產生utc timestamp數字
    time?: string, // ex: 13:05:44 與date合用產生utc timestamp數字
    status?: string
  } = {
      deviceId: 1,
      date: moment(new Date()).format('YYYY-MM-DD'),
      time: moment(new Date()).format('HH:mm:ss'),
      status: 'On'
    };

  flag = {
    save: false
  };

  /** Nvr選單 */
  nvrOptions: INvrOption[] = [];
  /** Device選單 */
  deviceOptions: IDeviceOption[] = [];
  statusOptions: string[] = ['On', 'Off'];
  eventTypeOptions: IEventTypeOption[] = [];

  constructor(
    private router: Router,
    private coreService: CoreService,
    private parseService: ParseService,
    private eventService: EventService
  ) { }

  ngOnInit() {
    this.initOptionData();
  }

  /** 讀取必要Nvr/Device資料 */
  initOptionData() {
    const fetchNvr$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query.limit(30000)
    }));
    const fetchDevice$ = Observable.fromPromise(this.parseService.fetchData({
      type: Device,
      filter: query => query.limit(30000)
    }));

    Observable.combineLatest(
      fetchNvr$, fetchDevice$,
      (response1, response2) => {
        this.getNvrAndDeviceOptions(response1, response2);
      }
    )
      .subscribe();
  }

  /** 取得固定的二階Nvr/Device選單 */
  getNvrAndDeviceOptions(nvrs: Nvr[], devices: Device[]) {
    if (!nvrs || !devices) {
      return;
    }
    this.nvrOptions = nvrs.map(nvr => {
      return {
        key: nvr.Name,
        value: nvr.Id,
        data: nvr,
        devices: devices.filter(dev => dev.NvrId === nvr.Id)
          .map(dev => {
            return {
              key: `${dev.Channel} ${dev.Name}`,
              value: dev.Channel,
              data: dev
            };
          })
      };
    });
    this.currentData.nvrId = this.nvrOptions[0].value;
    this.onChangeNvr();
  }

  /** 改變Nvr選項後的流程 */
  onChangeNvr() {
    const result = [{ key: '0 Local Alarm', value: 0, data: undefined }];
    const devices = this.nvrOptions.find(nvr => nvr.value === this.currentData.nvrId).devices;
    this.deviceOptions = devices ? result.concat(devices) : result;
    this.currentData.channelId = this.deviceOptions[0].value;
    this.onChangeDevice();
  }

  /** 改變Device選項後的流程 */
  onChangeDevice() {
    this.currentData.channelId = Number(this.currentData.channelId);
    const result = [];
    const types = this.currentData.channelId === 0
      ? EventDisplaySetup.EventGeneratorLocalAlarmEventType
      : EventDisplaySetup.EventGeneratorCameraEventType;
    types.forEach(type => {
      result.push({ key: this.eventService.getEventTypeDisplayText(type), value: type, checked: false });
    });
    this.eventTypeOptions = result;
  }

  /** 點擊Generate的流程 */
  clickGenerate() {
    // 產生timestamp
    const utcDate = moment(`${this.currentData.date} ${this.currentData.time}`).utc().format('x');

    const newEvents = this.eventTypeOptions
      .filter(type => type.checked === true)
      .map(type => new Event({
        NvrId: this.currentData.nvrId,
        ChannelId: Number(this.currentData.channelId),
        DeviceId: this.currentData.deviceId,
        Status: this.currentData.status,
        Time: Number(utcDate),
        Type: type.value
      }));

    if (newEvents.length === 0) {
      alert('Please tick at least 1 event type.');
      return;
    }

    this.flag.save = true;
    this.saveEvents(newEvents)
      .toPromise()
      .then(() => {
        this.flag.save = false;
        alert('Generate success.');
      })
      .catch(alert);
  }

  saveEvents(newEvents: Event[]) {
    if (!newEvents || newEvents.length === 0) {
      return Observable.of(null);
    }

    const save$ = (data: Event) => this.coreService.proxyMediaServer({
      method: 'POST',
      path: this.coreService.urls.URL_MEDIA_NEW_EVENT,
      body: this.getNewEventXml(data)
    });

    return Observable.from(newEvents)
      .concatMap(data => save$(data));
  }

  /** 取得新Event要post的xml內容 */
  getNewEventXml(data: Event) {
    return `<Event>
    <NvrID>${data.NvrId}</NvrID>
    <DeviceID>${data.DeviceId}</DeviceID>
    <Stream>${data.ChannelId}</Stream>
    <Type>${data.Type}</Type>
    <LocalTime>${data.Time}</LocalTime>
    <DeviceTime>${data.Time}</DeviceTime>
    <Count>1</Count>
    <Status id="${data.Status === 'On' ? 1 : 0}" trigger="1" value="1"/>
    </Event>`;
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

interface IEventTypeOption {
  key: string;
  value: string;
  checked: boolean;
}
