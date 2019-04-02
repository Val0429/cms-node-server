import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { IServerInfoStorage, IMediaDiskspace } from 'lib/domain/core';
import { ModalEditorModeEnum } from 'app/shared/enum/modalEditorModeEnum';
import ArrayHelper from 'app/helper/array.helper';
import MediaDiskHelper from 'app/helper/media-disk.helper';
import { ServerInfo } from '../../../model/core';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-storage-setting',
  templateUrl: './storage-setting.component.html',
  styleUrls: ['./storage-setting.component.css']
})
export class StorageSettingComponent implements OnInit {
  @Output() reloadServerInfoEvent: EventEmitter<any> = new EventEmitter();
  /** User自行輸入ServerIP */
  ipAddress: string;
  /** User自行輸入ServerPort */
  port: number;
  /** 從Server拿回的硬碟資料 */
  mediaDiskspace: IMediaDiskspace[];
  /** 從ServerInfo Config中找出目前 */
  currentRecordServer: ServerInfo;
  /** 與CurrentRecordServer對應的RecoveryServer */
  currentRecordRecoveryServer: ServerInfo;
  currentSmartMediaServer: ServerInfo;
  flag = { load: false, save: false };

  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
  }

  clickDetect() {
    if (!this.checkLegalConnectInfo()) {
      return;
    }

    this.mediaDiskspace = undefined;
    this.flag.load = true;

    this.getRelativeServer()
      .switchMap(() => {
        if (!this.currentRecordServer) {
          this.createNewServerInfo();
        }
        return this.getDiskspace();
      })
      .toPromise()
      .catch(alert)
      .then(() => this.flag.load = false);
  }

  /** 取得對應於ServerInfo的RecoveryServer資料, 用於修改或刪除時同步修正 */
  getRelativeServer() {
    return Observable.fromPromise(this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query
        .equalTo('Domain', this.ipAddress)
        .containedIn('Port', [this.port, 9966])
    })).map(recoveryServers => {
      this.currentRecordServer = recoveryServers.find(x => x.Type.toLowerCase() === 'recordserver')
        || recoveryServers.find(x => x.Type.toLowerCase() === 'recordfailoverserver');
      this.currentRecordRecoveryServer = recoveryServers.find(x => x.Type.toLowerCase() === 'recordrecoveryserver');
      this.currentSmartMediaServer = recoveryServers.find(x => x.Type.toLowerCase() === 'smartmedia');
    });
  }

  /** 新建一組ServerInfo，包含Record, RecordRecovery, SmartMedia */
  createNewServerInfo() {
    this.currentRecordServer = this.getNewServerInfo();
    this.currentRecordRecoveryServer = this.getNewRecordRecoveryServer();
    this.currentSmartMediaServer = this.getNewSmartMedia();
  }

  /** 依據User輸入的ip:port去取得該server上的硬碟資料 */
  getDiskspace() {
    const domainPath = `http://${this.ipAddress}:${this.port}`;
    return this.coreService.proxyMediaServer({
      method: 'GET',
      path: this.coreService.urls.URL_MEDIA_DISKSPACE,
      domainPath: domainPath
    }).map(result => {
      try {
        this.mediaDiskspace = ArrayHelper.toArray(result.DiskInfo.Disk);
      } catch (error) {
        Observable.throw(new Error(`Can not find any disk in ${domainPath}`));
      }
    });
  }

  clickSaveAsRecord() {
    if (!this.currentRecordServer
      || !this.currentRecordRecoveryServer
      || !this.currentSmartMediaServer) {
      return;
    }

    this.currentRecordServer.Type = 'RecordServer';
    this.currentRecordServer.Name = 'Record Server';
    this.flag.save = true;
    const saveList = [this.currentRecordServer, this.currentRecordRecoveryServer, this.currentSmartMediaServer];
    const save$ = this.currentRecordServer.Storage.length > 0
      ? Observable.fromPromise(Parse.Object.saveAll(saveList))
      : Observable.fromPromise(Parse.Object.destroyAll(saveList));

    save$
      .map(result => this.afterSave(result))
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  clickSaveAsFailover() {
    if (!this.currentRecordServer) {
      return;
    }

    this.currentRecordServer.Type = 'RecordFailoverServer';
    this.currentRecordServer.Name = 'Record Failover Server';
    this.flag.save = true;
    const save$ = this.currentRecordServer.Storage.length > 0
      ? Observable.fromPromise(this.currentRecordServer.save())
      : Observable.fromPromise(this.currentRecordServer.destroy());

    save$
      .map(result => this.afterSave([result]))
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  /** 儲存或刪除後進行Notify及刷新畫面 */
  afterSave(result: Parse.Object[]) {
    this.coreService.notifyWithParseResult({
      parseResult: result, path: this.coreService.urls.URL_CLASS_SERVERINFO
    });
    this.reloadServerInfoEvent.emit();
    this.mediaDiskspace = undefined;
    this.currentRecordServer = undefined;
    this.currentRecordRecoveryServer = undefined;
    alert('Update Success');
  }

  checkLegalConnectInfo(): boolean {
    const result = [];
    if (!this.ipAddress || this.ipAddress.length === 0) {
      result.push('Please input ip address.');
    }
    if (!this.port || (this.port >= 65535 || this.port < 1)) {
      result.push('Please input legal port from 1 to 65535.');
    }

    if (result.length > 0) {
      alert(result.join('\n'));
      return false;
    } else {
      return true;
    }
  }

  /** 新建ServerInfo for RecordServer */
  getNewServerInfo(): ServerInfo {
    const obj = new ServerInfo();
    // obj.Type = 'RecordServer';
    obj.Domain = this.ipAddress;
    obj.Port = this.port;
    obj.MaxCapacity = 100;
    // obj.Name = 'Record Server';
    obj.KeepDays = {
      Enable: true,
      Default: 10
    };
    obj.Storage = [];
    return obj;
  }

  /** 新建ServerInfo for RecoveryServer */
  getNewRecordRecoveryServer(): ServerInfo {
    const obj = new ServerInfo();
    obj.Type = 'RecordRecoveryServer';
    obj.Domain = this.ipAddress;
    obj.Port = this.port;
    obj.MaxCapacity = 100;
    obj.Name = 'Record Recovery Server';
    return obj;
  }

  getNewSmartMedia(): ServerInfo {
    const obj = new ServerInfo();
    obj.Type = 'SmartMedia';
    obj.Domain = this.ipAddress;
    obj.Port = 9966;
    obj.MaxCapacity = 100;
    obj.Name = 'Smart Media';
    return obj;
  }

  /** 檢查可選的硬碟是否已被勾選 */
  checkDiskSelected(disk: any): boolean {
    if (!this.currentRecordServer) {
      return false;
    }
    if (!this.currentRecordServer.Storage) {
      this.currentRecordServer.Storage = [];
    }
    return this.currentRecordServer.Storage.some(x => x.Path.indexOf(disk.Letter) >= 0);
  }

  /** 取得硬碟代號 */
  getDiskLetterCode(disk: IMediaDiskspace) {
    return disk.Letter.split(':')[0];
  }

  /** 增刪已選擇的硬碟 for layout操作 */
  setDiskStorage(disk: IMediaDiskspace) {
    const letter = this.getDiskLetterCode(disk); // 硬碟代號 ex: 'C'
    if (this.checkDiskSelected(disk)) { // 原已存在就刪除
      const item = this.currentRecordServer.Storage.find(x => x.Path.indexOf(letter) >= 0);
      const index = this.currentRecordServer.Storage.indexOf(item);
      this.currentRecordServer.Storage.splice(index, 1);
    } else { // 原不存在就新增
      const newObj: IServerInfoStorage = {
        Name: letter + ' Drive',
        KeepSpace: 50,
        Path: `${letter}:` + `\\BackendRecord\\`
      };
      const index = this.findDiskInsertIndex(disk);
      this.currentRecordServer.Storage.splice(index, 0, newObj);
    }
  }

  /** 勾選新的disk時，找出應存放於serverConfig.Storage內的順序 */
  findDiskInsertIndex(disk: IMediaDiskspace): number {
    if (!this.currentRecordServer.Storage) {
      this.currentRecordServer.Storage = [];
    }
    const letterCode = this.getDiskLetterCode(disk); // 取得Available硬碟代號 ex:'C'
    for (let i = 0; i < this.currentRecordServer.Storage.length; i++) {
      const itemLetter = this.currentRecordServer.Storage[i].Path.charAt(0); // 取得已儲存硬碟代號
      if (letterCode < itemLetter) { // compare alphabet
        return i;
      }
    }
    return this.currentRecordServer.Storage.length; // return length if new letterCode is bigger than all disk config letterCode.
  }

  /** 換算Bytes到適當單位 */
  countBytes(bytes: string): string {
    return MediaDiskHelper.countBytes(bytes);
  }

  /** 計算硬碟使用量 */
  countUsageSpace(disk: any): string {
    return MediaDiskHelper.countUsageSpace(disk);
  }

  /** 計算硬碟使用量百分比 */
  countUsagePercent(disk: any): string {
    return MediaDiskHelper.countUsagePercent(disk);
  }

}
