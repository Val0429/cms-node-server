import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { WeekScheduleOptions } from 'app/config/week-scheduler.config';
import { OptionHelper } from 'app/helper/option.helper';

@Component({
  selector: 'app-week-scheduler',
  templateUrl: './week-scheduler.component.html',
  styleUrls: ['./week-scheduler.component.css']
})
export class WeekSchedulerComponent implements OnInit, OnChanges {
  @Input() currentDevice: any;
  @Output() updateScheduleEvent: EventEmitter<any> = new EventEmitter();
  weekScheduleOptions: any; // plan選項
  scheduleConfigs: any;
  currentSchedule: any;
  currentScheduleTime: string[][]; // 存放一週計畫資料陣列
  constructor(private coreService: CoreService) { }

  ngOnInit() {
    this.coreService.getConfig({ path: this.coreService.urls.URL_CLASS_SCHEDULE })
      .map(result => this.scheduleConfigs = result.results)
      .subscribe();
    this.weekScheduleOptions = OptionHelper.getOptions(WeekScheduleOptions); // 取得plan選項物件
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentDevice) {
      this.currentDevice = changes.currentDevice.currentValue;
      this.getCurrentSchedule();
    }
  }

  getCurrentSchedule() {
    if (!this.currentDevice || !this.scheduleConfigs) {
      this.currentSchedule = undefined;
      return;
    }
    // 從ScheduleConfigs集合中找出對應資料
    this.currentSchedule = this.scheduleConfigs.find(x =>
      x.NvrId === this.currentDevice.NvrId
      && x.DeviceId === this.currentDevice.Channel);
    // 若找不到就建立新的
    if (!this.currentSchedule) {
      this.currentSchedule = this.getEmptySchedule();
      this.getScheduleTime();
    } else { // 有找到就再從DB中撈取最新資料
      this.coreService.getConfig({ path: this.coreService.urls.URL_CLASS_SCHEDULE, objectId: this.currentSchedule.objectId })
        .map(result => this.currentSchedule = result)
        .map(() => this.getScheduleTime())
        .subscribe();
    }
  }

  // 若當前Device沒有Schedule資料，建立一個空的來顯示與編輯
  getEmptySchedule(): any {
    return {
      objectId: '',
      NvrId: this.currentDevice.NvrId,
      DeviceId: this.currentDevice.Channel,
      Type: 'Event',
      Schedule: '1-1008', // Default Full Time
      PreRecord: '5',
      PostRecord: '30'
    };
  }

  // 轉換Schedule儲存字串為顯示用的陣列
  getScheduleTime() {
    this.currentScheduleTime = [];
    if (!this.currentSchedule) {
      return;
    }
    const saveArray = (this.currentSchedule.Schedule as string).split('-');
    if (saveArray.length < 2) { // 紀錄方式錯誤或不足
      return;
    }
    // 將儲存字串轉為實際顯示用的陣列資料
    let content = saveArray[0]; // 數字1或0的字元
    let tempArray = [];
    for (let i = 1; i < saveArray.length; i++) {
      tempArray = tempArray.concat(this.getScheduleSegment(content, saveArray[i]));
      content = content === '1' ? '0' : '1';
    }
    // 將陣列資料拆分為七天
    for (let i = 0; i < tempArray.length; i = i + 144) {
      const oneDay = tempArray.slice(i, i + 144) as Array<string>;
      this.currentScheduleTime.push(oneDay);
    }
  }

  // 取得特定長度的字串內容陣列
  getScheduleSegment(content: string, length: string): string[] {
    const result = [];
    const lengthNum = Number(length);
    for (let i = 0; i < lengthNum; i++) {
      result.push(content);
    }
    return result;
  }

  // 轉換Schedule顯示用的陣列為儲存字串，只有未來UserDefine功能實作後才用到
  setScheduleTime() {
    if (!this.currentScheduleTime) {
      return;
    }
    let tempArray = []; // 一維陣列 存放七天所有時段設定
    for (let i = 0; i < this.currentScheduleTime.length; i++) {
      tempArray = tempArray.concat(this.currentScheduleTime[i]);
    }
    let content = tempArray[0]; // 開頭設定1 or 0
    const saveArray = [content]; // 儲存字串 起頭為週一零時的設定
    let count = 0; // 每次變換內容的長度
    for (let i = 0; i < tempArray.length; i++) {
      if (tempArray[i] !== content) {
        saveArray.push(count.toString());
        content = content === '1' ? '0' : '1';
        count = 1;
      } else {
        count++;
      }
    }
    saveArray.push(count.toString()); // 迴圈結束後將做後一組count放入資料集
  }

  // Plan Select選項改變時的動作
  setSchedulePlan() {
    this.getScheduleTime();
  }

  // 點擊儲存事件
  clickSaveConfig() {
    if (!this.currentSchedule) {
      return;
    }
    const task = this.currentSchedule.objectId === ''
      ? this.coreService.postConfig({path: this.coreService.urls.URL_CLASS_SCHEDULE, data: this.currentSchedule, notify: true })
      : this.coreService.putConfig({path: this.coreService.urls.URL_CLASS_SCHEDULE, data: this.currentSchedule});
    task.map(() => alert('Update Success'))
      .map(() => this.updateScheduleEvent.emit(true))
      .subscribe();
  }
}
