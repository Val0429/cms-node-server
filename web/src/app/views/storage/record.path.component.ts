import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { ServerInfo, RecordPath } from 'app/model/core';
import { CryptoService } from 'app/service/crypto.service';
import { IRecordPath } from 'lib/domain/core';

@Component({
  selector: 'app-record-path',
  templateUrl: './record.path.component.html',
  styleUrls: ['./record.path.component.css']
})
export class RecordPathComponent implements OnInit {
    recordServerList: ServerInfo[];
    recordPaths:RecordPathDisplay[];
    flag={busy:false};
    currentRecordPath: RecordPath;
    checkedAll: boolean;
    anyChecked: boolean;
    constructor(private coreService: CoreService, private parseService: ParseService, private cryptoService:CryptoService) { }
  
    async ngOnInit() {
        await this.reloadRecordPath();
    }
    async deleteRecordPaths(){
        if(!confirm("Are you sure?"))return;
        try{
            this.flag.busy=true;            
            for(let item of this.recordPaths.filter(x=>x.checked===true)){
                await item.recordPath.destroy();
                this.coreService.notify({path:this.coreService.urls.URL_RECORDPATH, objectId:item.recordPath.id});
            }
            await this.reloadRecordPath();
        }catch(err){
            console.error(err);
        }finally{
            this.flag.busy=false;
        }
    }
    checkSelected(){
        let checked = this.recordPaths.map(e => e.checked);
        //console.debug("checked",checked);
        this.checkedAll = checked.length > 0 && checked.indexOf(undefined) < 0 && checked.indexOf(false) < 0;
        this.anyChecked = checked.length > 0 && checked.indexOf(true) >= 0;
        console.debug("this.checkedAll",this.checkedAll);
        console.debug("this.anyChecked",this.anyChecked);
      }
    checkAll($event: any){
        for(let record of this.recordPaths){
            record.checked = $event.target.checked;
        }
        this.checkSelected();
    }
    private async reloadRecordPath() {
        this.recordPaths = [];
        await this.parseService.fetchData({ type: RecordPath, filter: query => query.limit(Number.MAX_SAFE_INTEGER) })
            .then(results => {
                for(let result of results){
                    this.recordPaths.push({checked:false,recordPath:result});
                }
                
            });
        this.checkSelected();
    }
    checkSelectedPath($event:any, item :RecordPathDisplay){
        this.recordPaths.find(x=>x.recordPath==item.recordPath).checked = $event.target.checked;
        this.checkSelected();
    }
    clickSelectedRecordPath(item:RecordPathDisplay){
        console.debug(item);
        this.currentRecordPath = item.recordPath;
    }
    addRecordPath(){
        let newRecord=new RecordPath();
        newRecord.Name="NAS Server Name";
        newRecord.Path=``;
        newRecord.Account=this.cryptoService.encrypt4DB("Admin");
        newRecord.Password=this.cryptoService.encrypt4DB("123456");
        this.currentRecordPath=newRecord;
    }
}
interface RecordPathDisplay{
    checked:boolean;
    recordPath:RecordPath;
}