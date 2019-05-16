import { Component, OnInit, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ServerInfo, RecordPath } from '../../../model/core';
import { CryptoService } from 'app/service/crypto.service';
import { IServerInfo } from 'lib/domain/core';
import { ServerType } from '../server.component';
import { RecordPathDisplay } from 'app/views/storage/record.path.component';

@Component({
  selector: 'app-server-info-editor',
  templateUrl: './server-info-editor.component.html',
  styleUrls: ['./server-info-editor.component.css']
})
export class ServerInfoEditorComponent implements OnInit,OnChanges {
  @Input() flag:{busy:boolean};
  @Input() currentItem:ServerInfo;
  @Input() serverTypes:ServerType[];
  @Input() listRecordPaths:RecordPathDisplay[];
  @Output() reloadItemsEvent: EventEmitter<any> = new EventEmitter();
  @Output() closeEvent: EventEmitter<any> = new EventEmitter();  
  
  currentType:ServerType;
  editItem:IServerInfo;
  ipRegex=new RegExp(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/);  
  domainRegex = new RegExp(/^(([a-zA-Z]{1})|([a-zA-Z]{1}[a-zA-Z]{1})|([a-zA-Z]{1}[0-9]{1})|([0-9]{1}[a-zA-Z]{1})|([a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9]))\.([a-zA-Z]{2,6}|[a-zA-Z0-9-]{2,30}\.[a-zA-Z]{2,3})$/);
  
  constructor(private coreService:CoreService, private cryptoService:CryptoService) { }
  ngOnInit() {
      
  }
  serverTypeChange(){
      this.editItem.Port = this.currentType.DefaultPort;
      this.editItem.RecordPath = this.currentType.HasStorage ? []: null;      
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.currentItem || !this.currentItem) return;

    this.currentItem = changes.currentItem.currentValue;
    for(let item of this.listRecordPaths){
        item.checked = this.currentItem.RecordPath && this.currentItem.RecordPath.findIndex(x=>x.id == item.recordPath.id) >-1;        
    }
    this.currentType = this.serverTypes.find(x=>x.Type == this.currentItem.Type);    
    this.editItem = {
      Name:this.currentItem.Name, 
      Domain:this.currentItem.Domain,
      Port:this.currentItem.Port,
      Type:this.currentType.Type,
      MaxCapacity:this.currentItem.MaxCapacity,
      SSLPort:this.currentItem.SSLPort,
      RecordPath:this.currentItem.RecordPath,
      SubType:this.currentItem.SubType,
      TempPath:this.currentItem.TempPath      
    };
    
  }
  checkRecordPath(checked:boolean,item:RecordPathDisplay){      
      item.checked=checked;
      console.debug(this.listRecordPaths);
  }
  async clickDelete(){
    if(!confirm("Are you sure?"))return;
    try{
      this.flag.busy=true;
      await this.currentItem.destroy();
      this.coreService.notify({path:this.coreService.urls.URL_CLASS_SERVERINFO, objectId:this.currentItem.id});      
      this.reloadItemsEvent.emit();
      this.closeEvent.emit();
    }catch(err){
      console.debug(err);
    }finally{
      this.flag.busy=false;
    }
  }
  async clickSave(){
    try{
      console.debug("ip valid", this.ipRegex.test(this.editItem.Domain));
      console.debug("domain valid", this.domainRegex.test(this.editItem.Domain));
      let testDomain = this.editItem.Domain!="localhost" && this.editItem.Domain!="127.0.0.1" && (this.domainRegex.test(this.editItem.Domain) || this.ipRegex.test(this.editItem.Domain)) 
                        
      if(!testDomain){
        alert('invalid domain!')
        return;
      }
      this.flag.busy=true;
     
      this.currentItem.Name=this.editItem.Name; 
      this.currentItem.Domain=this.editItem.Domain;
      this.currentItem.Port=this.editItem.Port;
      
      this.currentItem.Type = this.currentType.Type;
      this.currentItem.SSLPort=this.editItem.SSLPort;
      this.currentItem.SubType=this.editItem.SubType;   
      this.currentItem.MaxCapacity=this.editItem.MaxCapacity;    
      if(this.currentType.HasStorage){
        this.currentItem.RecordPath= this.listRecordPaths.filter(x=>x.checked).map(e=>e.recordPath);          
      }else{
        this.currentItem.RecordPath=null;
        delete(this.currentItem.RecordPath);
      }
      this.currentItem.TempPath=this.editItem.TempPath;          

      await this.currentItem.save();
      await this.coreService.notifyUdpLogServerParseAddress(this.currentItem);
      console.debug(this.currentItem);
      this.coreService.notify({path:this.coreService.urls.URL_CLASS_SERVERINFO, objectId:this.currentItem.id})
      this.reloadItemsEvent.emit();
      this.closeEvent.emit();

    }catch(err){
      console.debug(err);
    }finally{
      this.flag.busy=false;
    }
  }
  clickClose(){
    this.closeEvent.emit();
  }
}

