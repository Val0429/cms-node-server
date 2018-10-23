import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'app-week-scheduler',
  templateUrl: './week-scheduler.component.html',
  styleUrls: ['./week-scheduler.component.css']
})
export class WeekSchedulerComponent implements OnInit, OnChanges {
  /** 多個schedule的設定陣列 */
  @Input() plans: string[][];
  @Input() options: IWeekSchedulerOptions;
  /** 讓父組件管理的狀態 */
  @Output() statusCheckCallback: EventEmitter<IStatusCallback> = new EventEmitter();
  /** 自定義結束後將結果通知父組件 */
  @Output() customPlanCallback: EventEmitter<string[][]> = new EventEmitter();
  /** 顯示圖表用的資料, 固定336(1008/3)個 */
  timeBlocks: TimeBlock[];
  /** 自定義編輯模式, 0(包含)以上=Plan index, -1=清除模式, -2=關閉 */
  customMode: { enable: boolean, index: number } = { enable: false, index: 0 };
  onDragMode: { enable: boolean, startDay: number, startTime: number, currentDay: number, currentTime: number } = {
    enable: false, startDay: 0, startTime: 0, currentDay: 0, currentTime: 0
  };
  defaultOptions: IWeekSchedulerOptions = {
    tooltips: ['Plan A', 'Plan B', 'Plan C'],
    colors: ['#F2BD37', '#D4B58C', '#D4D8BA']
  };
  /** Day of week */
  dayOfWeek = [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  ];
  /** 左邊Hour時間 */
  sideTimeHours = [];

  constructor() { }

  ngOnInit() {
    this.sideTimeHours = _.range(24); // an array from 0 to 23

    const $window = $(window);
    $window.mouseup(event => this.setEndDragEvent(event));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.plans) {
      this.plans = changes.plans.currentValue;
      this.initTimeBlock();
      this.convertPlanToTimeBlock();
      this.customMode.enable = false;
    }
    if (changes.options) {
      const tmp: IWeekSchedulerOptions = changes.options.currentValue || {};
      this.options = {
        tooltips: tmp.tooltips || this.defaultOptions.tooltips,
        colors: tmp.colors || this.defaultOptions.colors
      };
    }
  }

  /** 初始化顯示用的336個TimeBlock */
  initTimeBlock() {
    this.timeBlocks = [];
    for (let i = 0; i < 336; i++) {
      this.timeBlocks.push(new TimeBlock({ timeSequence: i, planCount: this.plans.length }));
    }
  }

  /** 將各plan的值反應到timeBlock中 */
  convertPlanToTimeBlock() {
    for (let i = 0; i < this.plans.length; i++) {
      const planToHalfHourBlock = _.chunk(this.plans[i], 3); // 每3個資料一組, 1008/3 = 336
      for (let j = 0; j < planToHalfHourBlock.length; j++) {
        if (planToHalfHourBlock[j].some(x => x === '1')) {
          this.timeBlocks[j].plans[i] = true;
        }
      }
    }
    this.statusCallback();
  }

  /** 將TimeBlocks內容轉為Schedule陣列 */
  convertTimeBlockToPlans() {
    const result: string[][] = [[], []];
    this.timeBlocks.forEach(tb => {
      for (let i = 0; i < this.plans.length; i++) {
        result[i] = result[i].concat(tb.toScheduleArray(i));
      }
    });
    return result;
  }

  /** call by UI, 依照dayOfWeek取得特定範圍的TimeBlocks */
  getTimeBlockByDay(index: number) {
    const rangeStart = index * 48;
    return this.timeBlocks.slice(rangeStart, rangeStart + 48);
  }

  /** call by UI, 依照顯示表給定值改變每格的底色 */
  getTimeBlockStyle(tb: TimeBlock) {
    const index = tb.getDisplayIndex();
    if (index >= this.options.colors.length) {
      return 'black'; // index的顏色未定義時顯示black
    }
    switch (index) {
      case -2: return 'red';
      case -1: return 'white';
      default: return this.options.colors[index];
    }
  }

  /** call by UI, 設定custom mode */
  setCustomMode(enable: boolean, index: number) {
    this.customMode.enable = enable;
    this.customMode.index = this.customMode.enable === false ? 0 : index;
    this.statusCallback();
    if (!this.customMode.enable) {
      this.customPlanCallback.emit(this.convertTimeBlockToPlans());
    }
  }

  /** CurrentRegion MouseDown事件, 由layout觸發 */
  setBeginDragEvent(event: JQuery.Event, i: number, j: number) {
    if (!this.customMode.enable) {
      return;
    }
    this.onDragMode = {
      enable: true, startDay: i, startTime: j, currentDay: i, currentTime: j
    };
  }

  /** CurrentRegion MouseUp事件 */
  setEndDragEvent(event: JQuery.Event) {
    if (!this.onDragMode.enable) {
      return;
    }
    this.onDragMode.enable = false;
    this.setOnDragRangeTimeBlocks();
  }

  /** 拖曳狀態下, 紀錄滑鼠經過的TimeBlock index */
  onDragHover(dayIndex: number, timeIndex: number) {
    if (!this.onDragMode.enable) {
      return;
    }
    // 未改變紀錄值時不做事
    if (dayIndex === this.onDragMode.currentDay && timeIndex === this.onDragMode.currentTime) {
      return;
    }
    // 改變拖曳紀錄index
    this.onDragMode.currentDay = dayIndex;
    this.onDragMode.currentTime = timeIndex;

    const inRangeBlocks = this.getDragModeRangeTimeBlock();
    const outRangeBlocks = this.timeBlocks.filter(x => inRangeBlocks.indexOf(x) < 0);
    inRangeBlocks.forEach(tb => tb.setOnDragDisplay(this.customMode.index));
    outRangeBlocks.forEach(tb => tb.setOnDragDisplay());
  }

  /** 取得當前OnDragMode下紀錄範圍的TimeBlocks */
  getDragModeRangeTimeBlock() {
    const dragLargerDay = this.onDragMode.startDay < this.onDragMode.currentDay;
    const minDay = dragLargerDay ? this.onDragMode.startDay : this.onDragMode.currentDay;
    const maxDay = dragLargerDay ? this.onDragMode.currentDay : this.onDragMode.startDay;
    const dragLargerTime = this.onDragMode.startTime < this.onDragMode.currentTime;
    const minTime = dragLargerTime ? this.onDragMode.startTime : this.onDragMode.currentTime;
    const maxTime = dragLargerTime ? this.onDragMode.currentTime : this.onDragMode.startTime;

    // 從範圍中挑出TimeBlocks
    let result: TimeBlock[] = [];
    for (let i = minDay; i <= maxDay; i++) {
      const rangeStart = i * 48;
      result = result.concat(this.timeBlocks.slice(rangeStart + minTime, rangeStart + maxTime + 1));
    }
    return result;
  }

  /** 設定單一TimeBlock的enable值 */
  setTimeBlockEnable(tb: TimeBlock) {
    tb.setEnableByIndex(this.customMode.index);
    tb.setOnDragDisplay(); // 還原
  }

  /** 依照目前的onDragMode及customMode內容來調整TimeBlock */
  setOnDragRangeTimeBlocks() {
    this.getDragModeRangeTimeBlock().forEach(tb => this.setTimeBlockEnable(tb));
  }

  /** 通知父組件有關此組件的狀態 */
  statusCallback() {
    this.statusCheckCallback.emit({
      isOverlap: this.timeBlocks.some(x => x.isOverlap()),
      onCustomMode: this.customMode.enable
    });
  }
}

class TimeBlock {
  /** 一週有336個TimeBlock(半小時), 從週一00:00起算為0, 直到週日23:30為335 */
  timeSequence: number;
  /** 紀錄各別plan是否enable */
  plans: boolean[];
  /** onDragMode時若此TimeBlock在選取範圍內，暫時顯示的顏色index, -2=還原, -1=清除, 0=plans[0]的顏色... */
  onDragDisplay: number;
  /** 有超過一個plan在此時段enable表示overlap */
  isOverlap() {
    return this.plans.filter(x => x).length > 1;
  }
  /** 為了依照目前plan的enable狀況顯示不同顏色, 透過此取得index
   * 0=第1個plan enable, 1=第2 ... 99=第100個
   * 100=101: 此時段overlap
   */
  getDisplayIndex(): number {
    if (this.onDragDisplay > -2) {
      return this.onDragDisplay;
    }
    if (this.isOverlap()) {
      return -2;
    }
    return this.plans.indexOf(true);
  }
  /** 將此時段的enable轉為enable陣列, 將成為1008筆enable資料的其中3個 */
  toScheduleArray(index: number) {
    const fillValue = this.plans[index] ? '1' : '0';
    return _.fill(Array(3), fillValue);
  }
  /** 設定此TimeBlock的enable值, 將指定index的plan設為true */
  setEnableByIndex(index: number) {
    if (index === -1) {
      this.plans = _.fill(Array(this.plans.length), false);
    }
    this.plans[index] = true;
  }
  /** 設定此TimeBlock在拖拉狀態下顯示的顏色參數, 未提供參數=還原 */
  setOnDragDisplay(index?: number) {
    this.onDragDisplay = index !== undefined ? index : -2;
  }
  constructor(args: { timeSequence: number, planCount: number }) {
    this.timeSequence = args.timeSequence;
    this.plans = _.fill(Array(args.planCount), false);
    this.onDragDisplay = -2;
  }
}

export interface IStatusCallback {
  isOverlap: boolean;
  onCustomMode: boolean;
}

export interface IWeekSchedulerOptions {
  /** 顯示於選擇plan時的文字 */
  tooltips?: string[];
  /** 格式: #FFFFFF */
  colors?: string[];
}
