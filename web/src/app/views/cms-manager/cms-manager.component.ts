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

  async ngOnInit() {
    await this.reloadData();
  }

  async reloadData() {
    // todo: failover的資料

    await this.parseService.getData({
      type: ServerInfo,
      filter: query => query.equalTo('Type', 'CMSManager')
    }).then(serverInfo => { 
      if(!serverInfo.SSLPort)serverInfo.SSLPort=7443;
      this.cmsManager = serverInfo;
    });    
  }

  /** 點擊Modal Save */
  async clickSaveConfig() {
    if (!this.cmsManager) {
      return;
    }
    try{
    this.isSaving = true;
      await this.cmsManager.save()
      .then(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_SERVERINFO
      }));
      setTimeout(async()=>await this.updateParseServerLocation(), 3000);
      alert('Update Success')
    }catch(err){
      alert("update failed");
      console.error(err);
    }finally{
      this.isSaving = false;
    }
  }
  async setStorageEvent(){
    console.debug("setStorageEvent");
    await this.clickSaveConfig();
  }
  private async updateParseServerLocation() {
    try{
      await this.coreService.notifyParseAddress(window.location.hostname, Number.parseInt(window.location.port));    
      await this.coreService.notifyUdpLogServerParseAddress(this.cmsManager);
    }catch(err){      
      console.error("Unable to call saveparseserver cgi", err);
    }
    
  }
  
}
