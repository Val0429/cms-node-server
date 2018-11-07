import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { IEventRecoverySetting } from 'lib/domain/core';
import { EventRecovery } from 'app/model/core';
import * as js2xmlparser from 'js2xmlparser';
import * as moment from 'moment';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-event-recovery',
  templateUrl: './event-recovery.component.html',
  styleUrls: ['./event-recovery.component.css']
})
export class EventRecoveryComponent implements OnInit {
  eventRecoveryConfig: EventRecovery;
  actionType = ['event', 'syslog', 'oplog'];
  /** 紀錄manual時間, 順序依照actionType */
  manualTime: IManualTime[];
  flag = {
    manual: true, // 是否開放manual recovery, 目前cgi未對接成功
    save: false
  };

  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    this.initManualTime();
    this.getEventRecovery().subscribe();
  }

  /** 取得資料庫中唯一一筆EventRecovery資料 */
  getEventRecovery() {
    return Observable.fromPromise(this.parseService.getData({
      type: EventRecovery
    })).map(result => {
      if (result) {
        this.eventRecoveryConfig = result;
      } else {
        const defaultSetting: IEventRecoverySetting = {
          Enable: false, Auto: false, Schedule: '1-1008'
        };
        this.eventRecoveryConfig = new EventRecovery({
          Event: defaultSetting,
          SystemLog: defaultSetting,
          OperationLog: defaultSetting
        });
      }
    });
  }

  /** 初始化畫面上的ManualRecovery時間 */
  initManualTime() {
    this.manualTime = [];
    for (let i = 0; i < this.actionType.length; i++) {
      this.manualTime.push({
        dateFrom: moment(new Date()).format('YYYY-MM-DD'),
        timeFrom: moment(new Date()).format('H:mm:ss'),
        dateTo: moment(new Date()).format('YYYY-MM-DD'),
        timeTo: moment(new Date()).format('H:mm:ss')
      });
    }
  }

  /** 點擊執行ManualRecovery, index依照actionType的指定順序 */
  clickEventAction(index: number) {
    const tsFrom = moment(`${this.manualTime[index].dateFrom} ${this.manualTime[index].timeFrom}`).format('x');
    const tsTo = moment(`${this.manualTime[index].dateTo} ${this.manualTime[index].timeTo}`).format('x');
    const postObject = {
      Action: this.actionType[index],
      StartTime: tsFrom,
      EndTime: tsTo
    };
    this.coreService.proxyMediaServer({
      method: 'POST',
      path: this.coreService.urls.URL_MEDIA_MANUAL_EVENT_LOG_RECOVERY,
      // body: js2xmlparser.parse('EventRecovery', postObject)
      body: postObject
    })
      .map(result => {
        console.debug(result);
        alert('success');
      })
      .subscribe();
  }

  /** 點擊儲存 */
  clickSaveConfig() {
    if (!this.eventRecoveryConfig) {
      return;
    }
    this.flag.save = true;
    Observable.fromPromise(this.eventRecoveryConfig.save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_EVENTRECOVERY
      }))
      .toPromise()
      .then(() => {
        alert('Update Success');
        this.flag.save = false;
      })
      .catch(alert);
  }
}

interface IManualTime {
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
}
