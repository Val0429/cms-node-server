import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { ServerInfo, RecordPath } from 'app/model/core';
import { CryptoService } from 'app/service/crypto.service';

@Component({
  selector: 'app-server',
  templateUrl: './server.component.html',
  styleUrls: ['./server.component.css']
})
export class ServerComponent implements OnInit {
    
    itemList:ServerInfoDisplay[];
    flag={busy:false};
    currentItem: ServerInfo;
    checkedAll: boolean;
    anyChecked: boolean;
    constructor(private coreService: CoreService, private parseService: ParseService, private cryptoService:CryptoService) { }
    serverTypes=["StreamServer","RecordServer"];
    async ngOnInit() {
        await this.reloadItems();
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
                    this.itemList.push({checked:false,serverInfo:result});
                }
                
            });
        this.checkSelected();
    }
    checkSelectedItem($event:any, item :ServerInfoDisplay){
        this.itemList.find(x=>x.serverInfo==item.serverInfo).checked = $event.target.checked;
        this.checkSelected();
    }
    clickSelectedItem(item:ServerInfoDisplay){
        console.debug(item);
        this.currentItem = item.serverInfo;
    }
    addItem(){ServerInfo
        let newRecord=new ServerInfo();
        newRecord.Name=`Server Info ${this.itemList.length+1}`;
        newRecord.Type=this.serverTypes[0];
        newRecord.Domain=`localhost`;
        newRecord.Port=80;
        newRecord.SSLPort=443;
        newRecord.MaxCapacity= 1;
        newRecord.Storage=[];
        newRecord.SubType="";
        newRecord.TempPath="";        
        this.currentItem=newRecord;
    }
}
interface ServerInfoDisplay{
    checked:boolean;
    serverInfo:ServerInfo;
}