import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Nvr, Device, EventHandler } from 'app/model/core';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-event',
  templateUrl: './event.component.html',
  styleUrls: ['./event.component.css']
})
export class EventComponent implements OnInit {
  selectorNvrList: ISelectorNvrModel[];
  currentDevice: Device;
  currentEventHandler: EventHandler; // 欲編輯的EventHandler
  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    this.fetchNvrAndDevice();
  }

  /** 取得左邊Selector列表 */
  fetchNvrAndDevice() {
    const fetchNvr$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query.ascending('Id').limit(30000)
    }));
    const fetchDevice$ = Observable.fromPromise(this.parseService.fetchData({
      type: Device,
      filter: query => query.ascending('Channel').limit(30000)
    }));
    const fetchEventHandler$ = Observable.fromPromise(this.parseService.fetchData({
      type: EventHandler,
      filter: query => query.limit(30000)
    }));

    this.selectorNvrList = [];
    Observable.combineLatest(
      fetchNvr$, fetchDevice$, fetchEventHandler$,
      (response1, response2, response3) => {
        response1.sort(function (a, b) {
          return (Number(a.Id) > Number(b.Id)) ? 1 : ((Number(b.Id) > Number(a.Id)) ? -1 : 0);
        });
        response1.forEach(nvr => {
          const newObj: ISelectorNvrModel = {
            Data: nvr, Devices: [], isCollapsed: true
          };
          const devices = response2.filter(dev => dev.NvrId === nvr.Id);
          devices.forEach(device => {
            const handler = response3.find(x => x.NvrId === nvr.Id && x.DeviceId === device.Channel);
            newObj.Devices.push({ Data: device, EventHandler: handler });
          });
          this.selectorNvrList.push(newObj);
        });
      }
    ).subscribe();
  }

  /** 利用參數Device找出相應EventHandler資料 */
  clickDevice(device: ISelectorDeviceModel) {
    if (device.Data.NvrId === '2') {
      alert('Smart Media is not available for handling event.');
      return;
    }
    this.currentDevice = device.Data;
    const item = device.EventHandler;
    if (item) {
      this.currentEventHandler = item;
    } else {
      device.EventHandler = new EventHandler({
        NvrId: device.Data.NvrId,
        DeviceId: device.Data.Channel,
        Schedule: '',
        EventHandler: []
      });
      this.currentEventHandler = device.EventHandler;
    }
  }

  // 取得單一device底下包含的EventTypes
  getEventHandlingTypes(device: ISelectorDeviceModel) {
    if (device.EventHandler) {
      const types = [];
      device.EventHandler.EventHandler.forEach(element => {
        if (element.Action.length > 0) {
          types.push(element.EventType + ' ' + element.Id);
        }
      });
      if (types.length === 0) {
        return 'None';
      }
      return types.join(', ');
    } else {
      return 'None';
    }
  }
}

interface ISelectorNvrModel {
  Data: Nvr;
  Devices: ISelectorDeviceModel[];
  isCollapsed: boolean;
}

interface ISelectorDeviceModel {
  Data: Device;
  EventHandler: EventHandler;
}
