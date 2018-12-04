import { Component, OnInit, TemplateRef, ViewChild, ElementRef } from '@angular/core';
import * as Parse from 'parse';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { ServerInfo } from 'app/model/core';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-cms-manager',
  templateUrl: './cms-manager.component.html',
  styleUrls: ['./cms-manager.component.css']
})
export class CmsManagerComponent implements OnInit {
  cmsManager: ServerInfo;
  failoverSetupIsCollapsed = true;
  failoverConfigs: any[] = [
    { name: 'CMS-M-001', virtualIP: '192.168.1.1', ip: '192.168.1.2', port: '80', status: 'Active' },
    { name: 'CMS-M-002', virtualIP: '192.168.1.1', ip: '192.168.1.3', port: '80', status: 'Backup' },
  ];
  isSaving: boolean;
  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    this.reloadData().subscribe();
  }

  reloadData() {
    // todo: failover的資料

    const get$ = Observable.fromPromise(this.parseService.getData({
      type: ServerInfo,
      filter: query => query.equalTo('Type', 'CMSManager')
    })).map(serverInfo => { 
      if(!serverInfo.SSLPort)serverInfo.SSLPort=7443;
      this.cmsManager = serverInfo;
    });
    return get$;
  }

  /** 點擊Modal Save */
  clickSaveConfig() {
    if (!this.cmsManager) {
      return;
    }
    this.isSaving = true;
    const save$ = Observable.fromPromise(this.cmsManager.save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_SERVERINFO
      }));

    save$
      .map(() => alert('Update Success'))
      .toPromise()
      .catch(alert)
      .then(() => this.isSaving = false);
  }
}
