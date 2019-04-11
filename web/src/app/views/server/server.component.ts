import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Observable } from 'rxjs/Observable';
import { IServerStorage, IMediaDiskspace, IDBSyncDestination, IRecordPath } from 'lib/domain/core';
import { Server, DBSync, ServerInfo, RecordPath } from 'app/model/core';
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
      this.reloadMediaDiskspace()
    ).subscribe();
  }
  reloadServerInfo() {
    return Observable.fromPromise(this.parseService.getData({
      type: ServerInfo,
      filter:query => query.contains("Type", "CMSManager")
    })).map(serverInfo => {
      this.serverInfo = serverInfo;
      console.debug("this.serverInfo", this.serverInfo);
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


  /** 修改Storage屬性的事件，由storage component call back */
  setStorage(storage: RecordPath) {
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



    const saveServerInfo$ = Observable.fromPromise(this.serverInfo.save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_SERVER
      }));

    saveServerInfo$
      .toPromise()
      .catch(alert)

    saveServer$
      .map(() => alert('Update Success'))
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

}
