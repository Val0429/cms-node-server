import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';

@Component({
  selector: 'app-week-board',
  templateUrl: './week-board.component.html',
  styleUrls: ['./week-board.component.css']
})
export class WeekBoardComponent implements OnInit, OnChanges {
  @Input() plans: string[][]; // 多個schedule的設定陣列
  @Output() checkIsOverlap: EventEmitter<any> = new EventEmitter();
  // allPlanScheduleTime: any; // 每個plan轉換字串後的實際資料
  /** 顯示圖表用的資料 */
  displayBlock: any;
  headerWeekDay = [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  ];
  /** 左邊Hour時間 */
  sideTimeHours = [];
  /** 顯示陣列有資料重疊的標記 */
  markOverlap = 'overlap';
  /** 依照順序為每個Schedule套用底色, 陣列長度代表支援上限 */
  halfHourBackground = [
    '#F2BD37', '#D4B58C', '#D4D8BA'
  ];

  constructor() { }

  ngOnInit() {
    this.initSideTimeHours();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.plans) {
      this.plans = changes.plans.currentValue;
      this.refreshDisplayContent();
    }
  }

  /** 初始化側邊Hours */
  initSideTimeHours() {
    this.sideTimeHours = [];
    for (let i = 0; i < 24; i++) {
      this.sideTimeHours.push(i.toString());
    }
  }

  /** 將所有字串轉換而來的顯示資料合併為One Week顯示表 */
  refreshDisplayContent() {
    this.displayBlock = _.fill(Array(48 * 7), '0'); // 一天48個半小時, 共7天, 48*7=336, 所有plan共用顯示
    let overlap = false;

    for (let i = 0; i < this.plans.length; i++) {
      const planToHalfHourBlock = _.chunk(this.plans[i], 3); // 每3個資料一組, 1008/3 = 336

      for (let j = 0; j < planToHalfHourBlock.length; j++) {
        if (planToHalfHourBlock[j].some(x => x === '1')) {
          if (this.displayBlock[j] === '0') { // 顯示陣列還沒被填過
            this.displayBlock[j] = (i + 1).toString();
          } else { // 顯示陣列已被填過, 將value改為表示重複
            this.displayBlock[j] = this.markOverlap;
            overlap = true;
          }
        }
      }
    }

    this.displayBlock = _.chunk(this.displayBlock, 48); // 每48個顯示陣列為一天, 共拆分為7天
    this.checkIsOverlap.emit(overlap);
  }

  /** 依照顯示表給定值改變每格的底色 */
  getHalfHourBlockStyle(data: string) {
    switch (data) {
      case this.markOverlap: return 'red';
      case '0': return '';
      default:
        const index = Number(data) - 1;
        if (index < this.halfHourBackground.length) {
          return this.halfHourBackground[index];
        } else {
          return '#242424'; // index的顏色未定義
        }
    }
  }
}
