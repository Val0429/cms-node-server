import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { IServerInfoStorage, IServerStorage } from 'lib/domain/core';
import { ServerInfo, RecordScheduleTemplate, RecordSchedule } from 'app/model/core';
import { Observable } from 'rxjs/Observable';
import { templateSourceUrl } from '@angular/compiler';

@Component({
  selector: 'app-storage-editor',
  templateUrl: './storage-editor.component.html',
  styleUrls: ['./storage-editor.component.css']
})
export class StorageEditorComponent implements OnInit, OnChanges {
  @Input() serverInfo: ServerInfo;
  @Input() storageIndex: number;
  @Output() closeEvent: EventEmitter<any> = new EventEmitter();
  @Output() reloadServerInfoEvent: EventEmitter<any> = new EventEmitter();
  storage: IServerInfoStorage;
  /** 與serverInfo對應的RecoveryServer */
  currentRecordRecoveryServer: ServerInfo;
  /** 與serverInfo對應的SmartMediaServer */
  currentSmartMediaServer: ServerInfo;
  flag = { load: false, save: false, delete: false };

  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.serverInfo) {
      this.serverInfo = changes.serverInfo.currentValue;
      this.getRelativeServer();
    }
    if (changes.storageIndex) {
      this.storageIndex = changes.storageIndex.currentValue;
    }
    this.storage = this.serverInfo ? this.serverInfo.Storage[this.storageIndex] : undefined;
  }

  /** 取得對應於ServerInfo的RecoveryServer資料, 用於修改或刪除時同步修正 */
  getRelativeServer() {
    if (this.serverInfo) {
      this.flag.load = true;
      const get$ = Observable.fromPromise(this.parseService.fetchData({
        type: ServerInfo,
        filter: query => query
          .equalTo('Domain', this.serverInfo.Domain)
          .containedIn('Port', [this.serverInfo.Port, 9966])
      }));

      get$
        .map(recoveryServers => {
          this.currentRecordRecoveryServer = recoveryServers.find(x => x.Type.toLowerCase() === 'recordrecoveryserver');
          this.currentSmartMediaServer = recoveryServers.find(x => x.Type.toLowerCase() === 'smartmedia');
        })
        .toPromise()
        .catch(alert)
        .then(() => this.flag.load = false);
    }
  }

  clickSave() {
    this.flag.save = true;

    this.serverInfo.Storage[this.storageIndex] = this.storage;
    const saveList = [this.serverInfo]; // RecordServer一定要儲存

    // 若有相對應的RecoveryServer及SmartMediaServer，就同步儲存新資料
    if (this.currentRecordRecoveryServer) {
      this.currentRecordRecoveryServer.Domain = this.serverInfo.Domain;
      this.currentRecordRecoveryServer.Port = this.serverInfo.Port;
      this.currentRecordRecoveryServer.MaxCapacity = this.serverInfo.MaxCapacity;
      saveList.push(this.currentRecordRecoveryServer);
    }
    if (this.currentSmartMediaServer) {
      this.currentSmartMediaServer.Domain = this.serverInfo.Domain;
      this.currentSmartMediaServer.MaxCapacity = this.serverInfo.MaxCapacity;
      saveList.push(this.currentSmartMediaServer);
    }

    Observable.fromPromise(Parse.Object.saveAll(saveList))
      .map(result => this.afterSave(result))
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  clickDelete() {
    if (confirm('Are you sure to delete this Record Server?')) {
      this.flag.delete = true;

      this.serverInfo.Storage.splice(this.storageIndex, 1);

      let delete$;
      if (this.serverInfo.Storage.length > 0) { // 因為還有其他Storage故用save的方式處理
        delete$ = Observable.fromPromise(this.serverInfo.save())
          .map(result => this.afterSave([result]));
      } else {
        const deleteList = [this.serverInfo];
        if (this.currentRecordRecoveryServer) {
          deleteList.push(this.currentRecordRecoveryServer);
        }
        if (this.currentSmartMediaServer) {
          deleteList.push(this.currentSmartMediaServer);
        }

        // 找出關聯於此RecordServer的RecordScheduleTemplate並修改
        const deleteTemplate$ = Observable.fromPromise(this.parseService.fetchData({
          type: RecordScheduleTemplate,
          filter: query => query.equalTo('Recorder', this.serverInfo)
        })).do(recordScheduleTemplates => {
          Observable.fromPromise(Parse.Object.destroyAll(recordScheduleTemplates))
            .map(data => this.coreService.addNotifyData({
              path: this.coreService.urls.URL_CLASS_RECORDSCHEDULETEMPLATE, dataArr: data
            })).subscribe();
        });

        // 找出被刪除的template所套用的recordSchedule連帶刪除
        const deleteRecordSchedule$ = (templates: RecordScheduleTemplate[]) => Observable.fromPromise(this.parseService.fetchData({
          type: RecordSchedule,
          filter: query => query.include('ScheduleTemplate')
            .containedIn('ScheduleTemplate', templates)
        })).switchMap(recordSchedules => {
          return Observable.fromPromise(Parse.Object.destroyAll(recordSchedules))
            .map(schedules => this.coreService.notifyWithParseResult({
              parseResult: schedules, path: this.coreService.urls.URL_CLASS_RECORDSCHEDULE
            }));
        });

        delete$ = Observable.fromPromise(Parse.Object.destroyAll(deleteList))
          .map(result => this.afterSave(result))
          .switchMap(() => deleteTemplate$)
          .switchMap(templates => deleteRecordSchedule$(templates));
      }

      delete$
        .toPromise()
        .catch(alert)
        .then(() => this.flag.delete = false);
    }
  }

  /** 儲存或刪除後Notify並刷新畫面 */
  afterSave(result: Parse.Object[]) {
    this.coreService.notifyWithParseResult({
      parseResult: result, path: this.coreService.urls.URL_CLASS_SERVERINFO
    });
    this.reloadServerInfoEvent.emit();
    this.clickClose();
  }

  clickClose() {
    this.closeEvent.emit();
  }

}
