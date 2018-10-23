import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { RecordScheduleTemplate, EventScheduleTemplate, ServerInfo } from 'app/model/core';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-schedule-template',
  templateUrl: './schedule-template.component.html',
  styleUrls: ['./schedule-template.component.css']
})
export class ScheduleTemplateComponent implements OnInit {
  /** 當前所有Record Schedule Template */
  recordScheduleTemplates: RecordScheduleTemplate[];
  /** 當前所有Event Schedule Template */
  eventScheduleTemplates: EventScheduleTemplate[];
  /** 建立RecordSchedule時預設套用的template */
  defaultRecordScheduleTemplate: any; // RecordSchedule預設套用的template
  /** 當前套用的template, 子組件的參數 */
  currentTemplate: any;
  /** 當前編輯的template */
  currentEditTemplate: any;
  /** 當前編輯template的類型代號, 子組件的參數, 1=RecordScheduleTemplate, 2=EventScheduleTemplate */
  templateSetupMode: number;
  /** 建立RecordScheduleTemplate時預設套用的Recorder資料 */
  defaultRecordServerInfo: ServerInfo;
  flag = {
    load: false
  };

  get getNotifyPath() {
    switch (this.templateSetupMode) {
      case 1: return this.coreService.urls.URL_CLASS_RECORDSCHEDULETEMPLATE;
      case 2: return this.coreService.urls.URL_CLASS_EVENTSCHEDULETEMPLATE;
    }
  }

  constructor(
    private coreService: CoreService,
    private parseService: ParseService
  ) { }

  ngOnInit() {
    this.templateSetupMode = 1;
    this.fetchRecordScheduleTemplate()
      .switchMap(() => this.fetchEventScheduleTemplate())
      .switchMap(() => this.getRecordServerInfo())
      .subscribe();
  }

  /** 依照目前setupMode, reload不同資料 */
  reloadTemplateConfig() {
    if (this.templateSetupMode === 1) {
      this.fetchRecordScheduleTemplate().subscribe();
    } else if (this.templateSetupMode === 2) {
      this.fetchEventScheduleTemplate().subscribe();
    }
  }

  /** 讀取DB的RecordScheduleTemplate */
  fetchRecordScheduleTemplate() {
    this.flag.load = true;
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: RecordScheduleTemplate,
      filter: query => query.limit(30000)
    })).map(result => this.recordScheduleTemplates = result)
      .do(() => {
        this.defaultRecordScheduleTemplate = this.recordScheduleTemplates.find(x =>
          x.Name.toLowerCase() === 'default') || this.recordScheduleTemplates[0];
        this.flag.load = false;
      });
    return fetch$;
  }

  /** 讀取DB的EventScheduleTemplate */
  fetchEventScheduleTemplate() {
    this.flag.load = true;
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: EventScheduleTemplate,
      filter: query => query.limit(30000)
    })).map(result => this.eventScheduleTemplates = result)
      .do(() => this.flag.load = false);
    return fetch$;
  }

  /** 取得RecordScheduleTemplate使用到的RecorderServer資訊 */
  getRecordServerInfo() {
    const get$ = Observable.fromPromise(this.parseService.getData({
      type: ServerInfo,
      filter: query => query
        .matches('Type', new RegExp('recordserver'), 'i')
        .limit(30000)
    })).map(serverInfo => this.defaultRecordServerInfo = serverInfo);
    return get$;
  }

  /** User點擊新增任一種Template */
  createNewTemplate() {
    let newObj: Parse.Object;
    switch (this.templateSetupMode) {
      case 1: newObj = this.getNewRecordScheduleTemplate(); break;
      case 2: newObj = this.getNewEventScheduleTemplate(); break;
    }
    if (newObj) {
      this.currentEditTemplate = newObj;
    }
  }

  /** 取得新的RecordScheduleTemplate物件 */
  getNewRecordScheduleTemplate() {
    if (!this.defaultRecordServerInfo) {
      alert('Please setup Record Server in Storage page before create Record Schedule Template');
      return undefined;
    }
    return new RecordScheduleTemplate({
      Name: 'New Template',
      FullRecord: {
        Schedule: '1-1008' // default working day
      },
      EventRecord: {
        Schedule: '0-1008', // default non-working day
        PreRecord: 5,
        PostRecord: 30
      },
      Recorder: this.defaultRecordServerInfo,
      KeepDays: '90'
    });
  }

  /** 取得新的EventScheduleTemplate物件 */
  getNewEventScheduleTemplate() {
    return new EventScheduleTemplate({
      Name: 'New Template',
      Schedule: '1-1008'
    });
  }

  /** 點擊其中一種Template, 開始套用流程 */
  clickScheduleTemplate(data: any, setupMode: number, isEdit: boolean) {
    this.currentTemplate = isEdit ? undefined : data;
    this.currentEditTemplate = isEdit ? data : undefined;
    this.templateSetupMode = setupMode;
  }
}
