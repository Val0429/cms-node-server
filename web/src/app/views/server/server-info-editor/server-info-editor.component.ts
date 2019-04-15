import { Component, OnInit, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ServerInfo } from '../../../model/core';
import { CryptoService } from 'app/service/crypto.service';
import { IServerInfo } from 'lib/domain/core';

@Component({
  selector: 'app-server-info-editor',
  templateUrl: './server-info-editor.component.html',
  styleUrls: ['./server-info-editor.component.css']
})
export class ServerInfoEditorComponent implements OnInit,OnChanges {
  @Input() flag:{busy:boolean};
  @Output() reloadItemsEvent: EventEmitter<any> = new EventEmitter();
  @Output() closeEvent: EventEmitter<any> = new EventEmitter();
  constructor(private coreService:CoreService, private cryptoService:CryptoService) { }
  @Input() currentItem:ServerInfo;
  editItem:IServerInfo;
  ngOnInit() {
      
  }
  @Input()serverTypes:string[];
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.currentItem || !this.currentItem) return;

    this.currentItem = changes.currentItem.currentValue;
    this.editItem = {
      Name:this.currentItem.Name, 
      Domain:this.currentItem.Domain,
      Port:this.currentItem.Port,
      Type:this.currentItem.Type,
      MaxCapacity:this.currentItem.MaxCapacity,
      SSLPort:this.currentItem.SSLPort,
      Storage:this.currentItem.Storage,
      SubType:this.currentItem.SubType,
      TempPath:this.currentItem.TempPath      
    };
    
  }
  async clickDelete(){
    if(!confirm("Are you sure?"))return;
    try{
      this.flag.busy=true;
      await this.currentItem.destroy();
      this.coreService.notify({path:this.coreService.urls.URL_CLASS_SERVERINFO, objectId:this.currentItem.id})
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
      this.flag.busy=true;
      console.debug(this.currentItem);
      this.currentItem.Name=this.editItem.Name; 
      this.currentItem.Domain=this.editItem.Domain;
      this.currentItem.Port=this.editItem.Port;
      this.currentItem.MaxCapacity=this.editItem.MaxCapacity;
      this.currentItem.Type=this.editItem.Type;
      this.currentItem.SSLPort=this.editItem.SSLPort;
      this.currentItem.SubType=this.editItem.SubType;
      //this.currentItem.Storage=this.editItem.Storage;
      this.currentItem.TempPath=this.editItem.TempPath;
          
      await this.currentItem.save();
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
