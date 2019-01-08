import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Nvr, Device, EventHandler } from 'app/model/core';
import { Observable } from 'rxjs/Observable';
import { CameraService } from 'app/service/camera.service';
import { NvrService } from 'app/service/nvr.service';

@Component({
  selector: 'app-event',
  templateUrl: './event.component.html',
  styleUrls: ['./event.component.css']
})
export class EventComponent implements OnInit {
  selectorNvrList: ISelectorNvrModel[];
  currentDevice: Device;
  currentEventHandler: EventHandler; // 欲編輯的EventHandler
  eventHandlers:EventHandler[];
  pageSize:number=20;
  p=1;
  total=0;
  constructor(private parseService: ParseService, private cameraService:CameraService, private nvrService:NvrService) { }

  async ngOnInit() {
    this.selectorNvrList = [];
    await this.fetchNvrAndDevice();
  }

  /** 取得左邊Selector列表 */
  async fetchNvrAndDevice() {
    this.selectorNvrList = [];
    
    let getEvents$ = this.parseService.fetchData({
      type: EventHandler,
      filter: query => query.limit(30000)
    }).then(res=>this.eventHandlers = res);
    
    let getNvrs$ = this.fetchNvrs();
    
    await Promise.all([getEvents$, getNvrs$]);
    
    console.debug("this.selectorNvrList", this.selectorNvrList);
  }
  private async fetchNvrs() {    
    const getNvrs$ = this.nvrService.getNvrList(this.p, this.pageSize).then(async (nvrs) => {
      this.selectorNvrList=[];
      let promises = [];
      for (let nvr of nvrs) {
        const newObj: ISelectorNvrModel = {
          Data: nvr, Devices: [], isCollapsed: true, page: 1, total: 0
        };
        let getDevice$ = this.cameraService.getDevice(nvr.Id, 1, this.pageSize).then(devices => {
          devices.forEach(device => {
            const handler = this.eventHandlers.find(x => x.NvrId === nvr.Id && x.DeviceId === device.Channel);
            newObj.Devices.push({ Data: device, EventHandler: handler });
          });
        });
        let getDeviceCount$ = this.cameraService.getDeviceCount(nvr.Id).then(res => newObj.total = res);
        this.selectorNvrList.push(newObj);
        promises.push(getDevice$);
        promises.push(getDeviceCount$);
      }
      await Promise.all(promises);
    });

    const getNvrsCount$ = this.nvrService.getNvrCount().then(res=>this.total=res);
    await Promise.all([getNvrs$, getNvrsCount$]);
  }

  async cameraPageChange(target:ISelectorNvrModel, event:number){
    target.page = event;
    target.Devices=[];
    let devices = await this.cameraService.getDevice(target.Data.Id, target.page, this.pageSize);
    devices.forEach(device => {
      const handler = this.eventHandlers.find(x => x.NvrId === target.Data.Id && x.DeviceId === device.Channel);
      target.Devices.push({ Data: device, EventHandler: handler });
    });
  }
  
 async pageChange(event:number){
   this.p = event;
   await this.fetchNvrs();
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
  Data: Nvr,
  Devices: ISelectorDeviceModel[],
  isCollapsed: boolean,
  page:number,
  total:number
}

interface ISelectorDeviceModel {
  Data: Device,
  EventHandler: EventHandler
}
