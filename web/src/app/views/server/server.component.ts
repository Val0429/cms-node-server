import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Observable } from 'rxjs/Observable';
import { IServerStorage, IMediaDiskspace, IDBSyncDestination } from 'lib/domain/core';
import { Server, DBSync, ServerInfo } from 'app/model/core';
import ArrayHelper from 'app/helper/array.helper';
import { Query } from 'parse';

@Component({
  selector: 'app-server',
  templateUrl: './server.component.html',
  styleUrls: ['./server.component.css']
})
export class ServerComponent implements OnInit {
  serverConfig: Server;
  serverInfo:ServerInfo;
  mediaDiskspace: IMediaDiskspace[];
  dbSync: DBSync;
  portOptions = [
    '80', '82', '7777', '8080', '8088'
  ];
  sslPortOptions = [
    '443', '777', '8081', '8089'
  ];
  storageIsCollapsed = true;
  flag = {
    save: false
  };
  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    Observable.combineLatest(
      this.reloadServerConfig(),
      this.reloadServerInfo(),
      this.reloadMediaDiskspace(),
      this.reloadDBSync()
    ).subscribe();
  }
  reloadServerInfo() {
    return Observable.fromPromise(this.parseService.getData({
      type: ServerInfo,
      filter:query => query.contains("Type", "CMSManager")
    })).map(serverInfo => {
      this.serverInfo = serverInfo;
      console.log("this.serverInfo", this.serverInfo);
    });
  }
  reloadServerConfig() {
    return Observable.fromPromise(this.parseService.getData({
      type: Server
    })).map(server => this.serverConfig = server);
  }

  reloadMediaDiskspace() {
    return this.coreService.proxyMediaServer({
      method: 'GET',
      path: this.coreService.urls.URL_MEDIA_DISKSPACE
    }).map(result => this.mediaDiskspace = ArrayHelper.toArray(result.DiskInfo.Disk));
  }

  reloadDBSync() {
    return Observable.fromPromise(this.parseService.getData({
      type: DBSync
    })).map(dbSync => this.dbSync = dbSync);
  }

  /** 修改Storage屬性的事件，由storage component call back */
  setStorage(storage: IServerStorage) {
    this.serverConfig.Storage = [storage];
    this.serverInfo.TempPath = storage.Path;
  }

  clickSaveConfig() {
    if (!this.serverConfig) {
      return;
    }
    this.flag.save = true;
    const saveServer$ = Observable.fromPromise(this.serverConfig.save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_SERVER
      }));

    const saveDBSync$ = Observable.fromPromise(this.dbSync.save())
      .map(data => {
        // 此主機Enable AutoSync時，將當前設定的備援Server全都改為Disable AutoSync
        if (data.autoSync === true) {
          data.destination.forEach(server => {
            this.coreService.getConfig({
              path: this.coreService.urls.URL_SET_DBSYNC_DISABLE,
              domainUrl: `http://${server.ip}:${server.port}/parse`
            })
            .subscribe();
          });
        }
      }); // DBSync不需要通知CMSM


    const saveServerInfo$ = Observable.fromPromise(this.serverInfo.save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_SERVER
      }));

    saveServerInfo$
      .switchMap(() => saveDBSync$)
      .toPromise()
      .catch(alert)

    saveServer$
      .switchMap(() => saveDBSync$)
      .map(() => alert('Update Success'))
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  /** 建立新的備份目的地 */
  createDBSyncDestination() {
    if (!this.dbSync.destination) {
      this.dbSync.destination = [];
    }
    this.dbSync.destination.push({ ip: '', port: 3000 });
  }

  /** 刪除一個備份目的地 */
  removeDBSyncDestination(item: IDBSyncDestination) {
    const index = this.dbSync.destination.indexOf(item);
    this.dbSync.destination.splice(index, 1);
  }
}
