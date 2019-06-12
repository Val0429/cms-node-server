import { Component, OnInit, TemplateRef, ViewChild, ElementRef } from '@angular/core';
import * as Parse from 'parse';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { ServerInfo } from 'app/model/core';
import { Observable } from 'rxjs/Observable';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-cms-manager',
  templateUrl: './cms-manager.component.html',
  styleUrls: ['./cms-manager.component.css']
})
export class CmsManagerComponent implements OnInit {
  cmsStatus:{isActive:boolean};
  cmsManager: ServerInfo;
  failoverSetupIsCollapsed = true;
  failoverConfigs: any[] = [
    { name: 'CMS-M-001', virtualIP: '192.168.1.1', ip: '192.168.1.2', port: '80', status: 'Active' },
    { name: 'CMS-M-002', virtualIP: '192.168.1.1', ip: '192.168.1.3', port: '80', status: 'Backup' },
  ];
  isSaving: boolean;
  localhost:boolean;
  @ViewChild('modalWindow') modalWindow;
  constructor(private coreService: CoreService, private parseService: ParseService) { }

  async ngOnInit() {
    this.localhost = window.location.hostname=="localhost"||window.location.hostname=="127.0.0.1";
    this.cmsStatus={isActive:false};
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
      if(!this.cmsManager.Domain || this.cmsManager.Domain.toLowerCase().trim().indexOf("localhost")>-1 || this.cmsManager.Domain.trim()=="127.0.0.1" ){
        alert("invalid domain");
        return;
      }
      this.isSaving = true;
      await this.coreService.getVersion(this.cmsManager.Domain, this.cmsManager.Port);
      this.modalWindow.show();
      
      await this.cmsManager.save();
      await this.updateParseServerLocation();
      
      setTimeout(async()=>await this.restartCMSManager(), 3000);
      
    }catch(err){
      alert("Unable to connect to CMS Manager");
      console.error(err);
    }finally{
      this.isSaving = false;      
    }
    
  }

  private async restartCMSManager() {
    console.debug("restart");
    let trial = 0;
    while (trial < 10) {
      try {
        console.debug("trial #", trial++);
        await this.coreService.getVersion();
        break;
      }
      catch (err) {
        console.error("cms still offline, retry trial #", --trial);
      }
    }
    console.debug("send notification");
    this.coreService.notifyWithParseResult({
      parseResult: [this.cmsManager], path: this.coreService.urls.URL_CLASS_SERVERINFO
    });
    //refresh page to get cms manager data
    if(!this.cmsStatus.isActive) setTimeout(()=>{window.location.href=window.location.href;}, 10000);
    this.modalWindow.hide();
  }

  async setStorageEvent(){
    console.debug("setStorageEvent");
    await this.clickSaveConfig();
  }
  private async updateParseServerLocation() {
    try{
      if(this.localhost)return;
      let port=Number.parseInt(window.location.port);
      if(!environment.production)port=3000;
      console.debug("port", port);
      await this.coreService.notifyParseAddress(window.location.hostname, port);    
      await this.coreService.notifyUdpLogServerParseAddress(this.cmsManager, window.location.hostname, port);
    }catch(err){      
      console.error("Unable to call saveparseserver cgi", err);
    }
    
  }
  
}
