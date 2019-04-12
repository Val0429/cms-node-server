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
    recordPaths:RecordPath[];
    flag={busy:false};
    currentRecordPath: RecordPath;
    constructor(private coreService: CoreService, private parseService: ParseService, private cryptoService:CryptoService) { }
  
    async ngOnInit() {
        await this.reloadRecordPath();
    }
    checkAll($event: any){
        console.debug($event);
    }
    private async reloadRecordPath() {
        this.recordPaths = [];
        await this.parseService.fetchData({ type: RecordPath, filter: query => query.limit(Number.MAX_SAFE_INTEGER) })
            .then(results => {
                this.recordPaths=results;
            });
    }
    checkSelectedPath($event:any, item :RecordPath){

    }
    clickSelectedRecordPath(item:RecordPath){
        console.debug(item);
        this.currentRecordPath = item;
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
