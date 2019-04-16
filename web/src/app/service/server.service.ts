import { Injectable } from '@angular/core';
import { CoreService } from './core.service';
import { ParseService } from './parse.service';
import { ServerInfo, RecordPath, RecordScheduleTemplate } from 'app/model/core';



  
@Injectable()
export class ServerService {
  
    constructor(
        private coreService: CoreService, 
        private parseService:ParseService
        ) { }
  async deleteRecordPaths(items:RecordPath[]){
    let recordServers = await this.parseService.fetchData({type:ServerInfo, filter:q=>q.equalTo("Type", "RecordRecoveryServer").limit(300000)});    
      
    let promises=[];
    for(let item of items){            
      promises.push(this.delRecord(item));         
      promises.push(this.updateServerInfo(item, recordServers));
      promises.push(this.updateScheduleTemplate(item));
    }
    await Promise.all(promises);
  }
  private async updateScheduleTemplate(item: RecordPath) {
    let scheduleTemplates = await this.parseService.fetchData({ type: RecordScheduleTemplate, filter: q => q.equalTo("RecordPath", item).limit(30000) });
    let promises=[];
    for (let template of scheduleTemplates) {
      template.RecordPath = null;
      let promise = template.save().then(res => this.coreService.notify({ path: this.coreService.urls.URL_CLASS_RECORDSCHEDULETEMPLATE, objectId: res.id }));
      promises.push(promise);
    }
    await Promise.all(promises);
  }

  private async delRecord(item:RecordPath){
    return item.destroy().then(res=>this.coreService.notify({path:this.coreService.urls.URL_RECORDPATH, objectId:res.id}));
  }
  private async updateServerInfo(item:RecordPath, recordServers:ServerInfo[]){
    for(let recordServer  of recordServers.filter(x=>x.Storage.length>0)){
      let recordpathIndex = recordServer.Storage.findIndex(x=>x.id == item.id);
      if(recordpathIndex<0)continue;
      recordServer.Storage.splice(recordpathIndex, 1);
      return await recordServer.save().then(x=> this.coreService.notify({path:this.coreService.urls.URL_CLASS_SERVERINFO, objectId:x.id}));      
    }
  }
}