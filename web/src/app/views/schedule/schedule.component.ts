import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit {
  currentDevice: any; // 透過selector得到的當前device
  updateLatest: boolean; // 利用來更新nvr-device-selector保持最新資料
  constructor() { }

  ngOnInit() {}

  // 讓Nvr Device Selector使用的事件
  selectDeviceEvent(device: any) {
    this.currentDevice = device;
  }

  updateScheduleEvent(needUpdate: boolean) {
    this.updateLatest = !this.updateLatest;
  }
}
