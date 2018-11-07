import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { RecordScheduleTemplate, ServerInfo, RecordSchedule } from 'app/model/core';
import OptionHelper from 'app/helper/option.helper';
import { WeekScheduleOptions } from 'app/config/week-scheduler.config';
import { Observable } from 'rxjs/Observable';
import { IStatusCallback, IWeekSchedulerOptions } from './week-scheduler/week-scheduler.component';

@Component({
  selector: 'app-schedule-template-editor',
  templateUrl: './schedule-template-editor.component.html',
  styleUrls: ['./schedule-template-editor.component.css']
})
export class ScheduleTemplateEditorComponent implements OnInit, OnChanges {
  @Input() setupMode: number;
  @Input() currentTemplate: any;
  @Output() updateTemplateEvent: EventEmitter<any> = new EventEmitter(); // 更新template資料後callback更新template清單
  @Output() modalHide: EventEmitter<any> = new EventEmitter();
  weekScheduleOptions: { key: string, value: string }[]; // plan選項
  recorderList: ServerInfo[]; // Recorder選項
  currentPlans: string[][]; // 要傳給week board的參數
  /** 因轉時區不可影響到原資料，故暫存Template的Schedule */
  schedules: {
    recordSchedule?: {
      fullRecord: string;
      eventRecord: string;
    }
    eventSchedule?: string;
  } = {};
  flag = {
    save: false,
    delete: false,
    isOverlap: false,
    onCustomMode: false
  };

  /** 傳給WeekScheduler的參數, tooltips與colors長度必須相同 */
  get weekSchedulerOption(): IWeekSchedulerOptions {
    switch (this.setupMode) {
      case 1: return { tooltips: ['Full Record Plan', 'Event Record Plan'], colors: ['#7FB3EF', '#BADBFF'] };
      case 2: return { tooltips: ['Event Schedule Plan'], colors: ['#87DADC'] };
    }
  }

  get getNotifyPath() {
    switch (this.setupMode) {
      case 1: return this.coreService.urls.URL_CLASS_RECORDSCHEDULETEMPLATE;
      case 2: return this.coreService.urls.URL_CLASS_EVENTSCHEDULETEMPLATE;
    }
  }

  get customWeekPlanKey(): string[] {
    switch (this.setupMode) {
      case 1: return ['Full Record Custom', 'Event Record Custom'];
      case 2: return ['Event Schedule Custom'];
    }
  }

  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    this.getRecorderOptions().subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentTemplate) {
      this.currentTemplate = changes.currentTemplate.currentValue;
      this.resetWeekScheduleOptions(); // 每次讀template都要初始化, 避免其他template的自訂內容影響當前選項
      this.initScheduleAndPlanByTemplate();
    }
  }

  /** 初始化plan選項物件 */
  resetWeekScheduleOptions() {
    this.weekScheduleOptions = OptionHelper.getOptions(WeekScheduleOptions);
  }

  /** 依據欲編輯的template, 將plan轉為local time並追加custom選項 */
  initScheduleAndPlanByTemplate() {
    if (this.currentTemplate) {
      if (this.setupMode === 1) {
        this.schedules = {
          recordSchedule: {
            fullRecord: this.convertScheduleToLocalTime(this.currentTemplate.FullRecord.Schedule),
            eventRecord: this.convertScheduleToLocalTime(this.currentTemplate.EventRecord.Schedule)
          }
        };
        this.setSchedulePlanCustom({ key: this.customWeekPlanKey[0], value: this.schedules.recordSchedule.fullRecord });
        this.setSchedulePlanCustom({ key: this.customWeekPlanKey[1], value: this.schedules.recordSchedule.eventRecord });
      }
      if (this.setupMode === 2) {
        this.schedules = {
          eventSchedule: this.convertScheduleToLocalTime(this.currentTemplate.Schedule)
        };
        this.setSchedulePlanCustom({ key: this.customWeekPlanKey[0], value: this.schedules.eventSchedule });
      }

      this.getPlans();
    }
  }

  /** 取得Recorder的選單 */
  getRecorderOptions() {
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query.matches('Type', new RegExp('RecordServer'), 'i')
    })).do(result => this.recorderList = result);
    return fetch$;
  }

  /** 判斷Recorder是否為目前Template所選 */
  getRecorderSelected(recorder: ServerInfo) {
    if (!this.recorderList || !this.currentTemplate.Recorder) {
      return false;
    }
    return this.currentTemplate.Recorder.id === recorder.id;
  }

  onChangeRecorder($event: any) {
    this.currentTemplate.Recorder = this.recorderList.find(x => x.id === $event.target.value);
  }

  /** 將所有Template的Schedule字串轉為顯示用的大陣列 */
  getPlans(): string[] {
    this.currentPlans = [];
    if (!this.currentTemplate) {
      return;
    }

    if (this.setupMode === 1) {
      this.currentPlans.push(this.convertScheduleToArray(this.schedules.recordSchedule.fullRecord));
      this.currentPlans.push(this.convertScheduleToArray(this.schedules.recordSchedule.eventRecord));
    }
    if (this.setupMode === 2) {
      this.currentPlans.push(this.convertScheduleToArray(this.schedules.eventSchedule));
    }
  }

  clickSave() {
    // 若沒有設定Recorder就給第一筆選項當預設值
    if (!this.currentTemplate.Recorder && this.recorderList.length > 0) {
      this.currentTemplate.Recorder = this.recorderList[0];
    }

    this.flag.save = true;

    // 存為UTC時間下的結果
    if (this.setupMode === 1) {
      this.currentTemplate.FullRecord.Schedule = this.convertScheduleToUTC(this.schedules.recordSchedule.fullRecord);
      this.currentTemplate.EventRecord.Schedule = this.convertScheduleToUTC(this.schedules.recordSchedule.eventRecord);
    }
    if (this.setupMode === 2) {
      this.currentTemplate.Schedule = this.convertScheduleToUTC(this.schedules.eventSchedule);
    }
    console.log("save currentTemplate", this.currentTemplate);
    Observable.fromPromise((this.currentTemplate as Parse.Object).save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.getNotifyPath
      }))
      .do(() => {
        alert('Update Success');
        if (this.updateTemplateEvent) {
          this.updateTemplateEvent.emit();
        }
        if (this.modalHide) {
          this.modalHide.emit();
        }
      })
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  clickDelete() {
    if (confirm('Are you sure to delete this template?')) {
      this.flag.delete = true;
      console.log("delete currentTemplate", this.currentTemplate);
      const deleteTemplate$ = Observable.fromPromise((this.currentTemplate as Parse.Object).destroy())
        .map(result => this.coreService.notifyWithParseResult({
          parseResult: [result], path: this.getNotifyPath
        })).do(() => {
          if (this.updateTemplateEvent) {
            this.updateTemplateEvent.emit();
          }
          this.clickClose();
        });

      this.deleteRecordSchedule()
        .switchMap(() => deleteTemplate$)
        .toPromise()
        .catch(alert)
        .then(() => this.flag.delete = false);

    } else {
      return;
    }
  }

  clickClose() {
    if (this.modalHide) {
      this.modalHide.emit();
    }
  }

  /** 要刪除目前編輯的RecordScheduleTemplate之前，先刪除套用此Template的RecordSchedule */
  deleteRecordSchedule() {
    if (this.setupMode !== 1) {
      return Observable.of(null);
    }

    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: RecordSchedule,
      filter: query => query.equalTo('ScheduleTemplate', this.currentTemplate)
    }));
    const delete$ = (data: RecordSchedule[]) => Observable.fromPromise(Parse.Object.destroyAll(data))
      .map(results => this.coreService.notifyWithParseResult({
        parseResult: results, path: this.coreService.urls.URL_CLASS_RECORDSCHEDULE
      }));
    return get$.switchMap(data => delete$(data));
  }

  /** 讓week board組件檢查是否重複plan時程的事件 */
  statusCheckCallback(event: IStatusCallback) {
    this.flag.isOverlap = event.isOverlap;
    this.flag.onCustomMode = event.onCustomMode;
  }

  /** 自訂完plan後的callback */
  customPlanCallBack(plans: string[][]) {
    this.currentPlans = plans;

    if (this.setupMode === 1) {
      const customKey = ['Full Record Custom', 'Event Record Custom'];
      this.schedules.recordSchedule.fullRecord = this.convertArrayToSchedule(this.currentPlans[0]);
      this.schedules.recordSchedule.eventRecord = this.convertArrayToSchedule(this.currentPlans[1]);
      this.setSchedulePlanCustom({ key: customKey[0], value: this.schedules.recordSchedule.fullRecord });
      this.setSchedulePlanCustom({ key: customKey[1], value: this.schedules.recordSchedule.eventRecord });
    }
    if (this.setupMode === 2) {
      const customKey = ['Event Schedule Custom'];
      this.schedules.eventSchedule = this.convertArrayToSchedule(this.currentPlans[0]);
      this.setSchedulePlanCustom({ key: customKey[0], value: this.schedules.eventSchedule });
    }
  }

  /** 檢查指定value是否存在於預設選項中，若無則將自定義Schedule放入Plan選項 */
  setSchedulePlanCustom(args: { key: string, value: string }) {
    // 預設選項中已有相同value, 則不新增選項
    if (this.weekScheduleOptions
      .filter(x => this.customWeekPlanKey.indexOf(x.key) < 0)
      .some(x => x.value === args.value)) {
      return;
    }
    // 檢查選項中是否有同key的物件, 新增或取代之
    const customOption = this.weekScheduleOptions.find(x => x.key === args.key);
    if (customOption) {
      customOption.value = args.value;
    } else {
      this.weekScheduleOptions.push(args);
    }
  }

  /** 將Schedule字串依照當地時區調整為UTC */
  convertScheduleToUTC(schedule: string) {
    const offsetUnit = new Date().getTimezoneOffset();
    return this.convertScheduleWithTimezone({ scheduleString: schedule, offsetUnit: 0 + offsetUnit });
  }

  convertScheduleToLocalTime(schedule: string) {
    const offsetUnit = new Date().getTimezoneOffset();
    return this.convertScheduleWithTimezone({ scheduleString: schedule, offsetUnit: 0 - offsetUnit });
  }

  /** 指定timezone offset, 調整schedule字串 */
  convertScheduleWithTimezone(args: { scheduleString: string, offsetUnit: number }) {
    const absOffsetUnit = Math.abs(args.offsetUnit / 10); // 每10分鐘一單位
    let scheduleArray = this.convertScheduleToArray(args.scheduleString);

    // offset大於0代表時區為負數, 將時間設定搬移往後
    if (args.offsetUnit > 0) {
      const moveIndex = scheduleArray.length - absOffsetUnit;
      const newArray = scheduleArray.slice(moveIndex, scheduleArray.length);
      scheduleArray.splice(moveIndex, absOffsetUnit);
      scheduleArray = newArray.concat(scheduleArray);
    } else if (args.offsetUnit < 0) { // offset 小於0代表時區為正數, 將時間設定搬移往前
      const newArray = scheduleArray.slice(0, absOffsetUnit);
      scheduleArray = scheduleArray.concat(newArray);
      scheduleArray.splice(0, absOffsetUnit);
    }

    return this.convertArrayToSchedule(scheduleArray);
  }

  /** 傳入Schedule字串取得Schedule陣列 */
  convertScheduleToArray(schedulePlan: string): string[] {
    let result = [];
    const saveArray = schedulePlan.split('-');
    if (saveArray.length < 2) { // 紀錄方式錯誤或不足
      return result;
    }

    let content = saveArray[0]; // 字串第一個字作為起始值, 只會是數字1或0的字元
    let tempArray = [];
    for (let i = 1; i < saveArray.length; i++) {
      tempArray = tempArray.concat(_.fill(Array(Number(saveArray[i])), content));
      content = content === '1' ? '0' : '1'; // 轉換當前值 1 or 0
    }

    // result = _.chunk(tempArray, 144); // 將陣列資料拆分為七天, 1單位=10min, 1天=144
    result = tempArray;
    return result;
  }

  /** 轉換Schedule陣列為字串設定 */
  convertArrayToSchedule(array: string[]): string {
    let content = array[0];
    let count = 0;
    let result = content;

    array.forEach(item => {
      if (item === content) {
        count++;
      } else {
        result = result + '-' + count.toString();
        content = content === '1' ? '0' : '1';
        count = 1;
      }
    });
    result = result + '-' + count.toString();
    return result;
  }
}
