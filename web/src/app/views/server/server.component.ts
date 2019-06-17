import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { ServerInfo, RecordPath } from 'app/model/core';
import { CryptoService } from 'app/service/crypto.service';
import { RecordPathDisplay } from '../storage/record.path.component';

@Component({
  selector: 'app-server',
  templateUrl: './server.component.html',
  styleUrls: ['./server.component.css']
})
export class ServerComponent implements OnInit {
    recordPaths:RecordPathDisplay[];
    itemList:ServerInfoDisplay[];
    flag={busy:false};
    currentItem: ServerInfo;
    checkedAll: boolean;
    anyChecked: boolean;
    localhost: boolean;
    constructor(private coreService: CoreService, private parseService: ParseService, private cryptoService:CryptoService) { }
    serverTypes:ServerType[]=[
      {Type:"SmartMediaServer", DisplayName:"Smart Media Server", DefaultPort:9966, HasStorage:false},
      {Type:"StreamServer", DisplayName:"Stream Server", DefaultPort:7004, HasStorage:false},
      {Type:"RecordServer", DisplayName:"Record Server", DefaultPort:7002, HasStorage:false},
      {Type:"ExportServer", DisplayName:"Export Server", DefaultPort:7005, HasStorage:false},
      {Type:"ControlServer", DisplayName:"Control Server", DefaultPort:7003, HasStorage:false},
      {Type:"RecordRecoveryServer", DisplayName:"Record Recovery Server", DefaultPort:7006, HasStorage:true}
    ];
    async ngOnInit() {
        await this.reloadItems();
        this.localhost = window.location.hostname=="localhost"||window.location.hostname=="127.0.0.1";
    }
    async deleteItems(){
        if(!confirm("Are you sure?"))return;
        try{
            this.flag.busy=true;            
            for(let item of this.itemList.filter(x=>x.checked===true)){
                await item.serverInfo.destroy();
                this.coreService.notify({path:this.coreService.urls.URL_CLASS_SERVERINFO, objectId:item.serverInfo.id});
            }
            await this.reloadItems();
        }catch(err){
            console.error(err);
        }finally{
            this.flag.busy=false;
        }
    }
    checkSelected(){
        let checked = this.itemList.map(e => e.checked);
        //console.debug("checked",checked);
        this.checkedAll = checked.length > 0 && checked.indexOf(undefined) < 0 && checked.indexOf(false) < 0;
        this.anyChecked = checked.length > 0 && checked.indexOf(true) >= 0;
        console.debug("this.checkedAll",this.checkedAll);
        console.debug("this.anyChecked",this.anyChecked);
      }
    checkAll($event: any){
        for(let record of this.itemList){
            record.checked = $event.target.checked;
        }
        this.checkSelected();
    }
    private async reloadItems() {
        this.itemList = [];
        
        await this.parseService.fetchData({ type: ServerInfo, filter: query => query.notEqualTo("Type", "CMSManager").limit(Number.MAX_SAFE_INTEGER) })
            .then(results => {
                for(let result of results){
                    this.itemList.push({checked:false,serverInfo:result, displayName:this.serverTypes.find(x=>x.Type == result.Type).DisplayName});
                }                
            });
        this.checkSelected();
    }

    private async getAvailableRecordPaths(id:string){
      this.recordPaths=[];
      let occupiedPaths = [];
      for(let item of this.itemList.filter(x=>x.serverInfo.RecordPath && x.serverInfo.id != id)){
        occupiedPaths.push(...item.serverInfo.RecordPath.map(e=>e.id));
      }
      console.debug("occupiedPaths", occupiedPaths);
      await this.parseService.fetchData({ type: RecordPath, filter: q => q.notContainedIn("objectId", occupiedPaths).limit(Number.MAX_SAFE_INTEGER) })
      .then(results => {
        for (let result of results) {
          this.recordPaths.push({ checked: false, recordPath: result });
        }
      });
    }

    checkSelectedItem($event:any, item :ServerInfoDisplay){
        this.itemList.find(x=>x.serverInfo==item.serverInfo).checked = $event.target.checked;
        this.checkSelected();
    }
    async clickSelectedItem(item:ServerInfoDisplay){
        console.debug(item);
        await this.getAvailableRecordPaths(item.serverInfo.id);
        this.currentItem = item.serverInfo;        
    }
    async addItem(){        
        let newRecord=new ServerInfo();
        newRecord.Name=`Server Info ${this.itemList.length+1}`;
        newRecord.Type=this.serverTypes[0].Type;
        newRecord.Domain=``;
        newRecord.Port=this.serverTypes[0].DefaultPort;
        newRecord.SSLPort=undefined;
        newRecord.MaxCapacity= 15000;
        newRecord.RecordPath=this.serverTypes[0].HasStorage ? [] : undefined;
        newRecord.SubType="";
        newRecord.TempPath=undefined;        
        this.currentItem=newRecord;
        await this.getAvailableRecordPaths("");
    }
}
interface ServerInfoDisplay{
    checked:boolean;
    serverInfo:ServerInfo;
    displayName:string;
}
export interface ServerType{
  Type:string;
  DisplayName:string;
  DefaultPort:number;
  HasStorage:boolean;
}