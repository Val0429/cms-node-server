import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Observable } from 'rxjs/Observable';
import { IServerStorage, IMediaDiskspace } from 'lib/domain/core';
import { Server, ServerInfo } from 'app/model/core';
import ArrayHelper from 'app/helper/array.helper';

@Component({
  selector: 'app-temp-path',
  templateUrl: './temp-path.component.html',
  styleUrls: ['./temp-path.component.css']
})
export class TempPathComponent implements OnInit {
  serverConfig: Server;
  @Input()serverInfo:ServerInfo;
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

  @Output() setStorageEvent: EventEmitter<any> = new EventEmitter();

  constructor(private coreService: CoreService, private parseService: ParseService) { }
  @Input() cmsStatus:{isActive:boolean};
  async ngOnInit() {
    
    try{
      Observable.combineLatest(
        this.reloadServerConfig()
      ).subscribe();
      console.debug(this.cmsStatus.isActive);
      await this.reloadMediaDiskspace();
      this.cmsStatus.isActive=true;
      console.debug(this.cmsStatus.isActive);
    }catch(err){
      console.error(err);
      this.cmsStatus.isActive=false;
    }
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
    }).map(result => this.mediaDiskspace = ArrayHelper.toArray(result.DiskInfo.Disk)).toPromise();
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
    const saveServer$ = Observable.fromPromise(this.serverConfig.save());

    saveServer$
      //.map(() => alert('Update Success'))
      .toPromise()
      .catch(alert)
      .then(() => {
        this.flag.save = false;
        this.setStorageEvent.emit();
      });
  }

}
