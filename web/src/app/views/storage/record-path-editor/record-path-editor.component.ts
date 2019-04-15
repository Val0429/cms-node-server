import { Component, OnInit, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { RecordPath } from '../../../model/core';
import { CryptoService } from 'app/service/crypto.service';
import { IRecordPath } from 'lib/domain/core';

@Component({
  selector: 'app-record-path-editor',
  templateUrl: './record-path-editor.component.html',
  styleUrls: ['./record-path-editor.component.css']
})
export class RecordPathEditorComponent implements OnInit,OnChanges {
  @Input() flag:{busy:boolean};
  @Output() reloadRecordPathEvent: EventEmitter<any> = new EventEmitter();
  @Output() closeEvent: EventEmitter<any> = new EventEmitter();
  constructor(private coreService:CoreService, private cryptoService:CryptoService) { }
  @Input() currentRecordPath:RecordPath;
  editRecordPath:IRecordPath;
  ngOnInit() {
      
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.currentRecordPath || !this.currentRecordPath) return;

    this.currentRecordPath = changes.currentRecordPath.currentValue;
    this.editRecordPath = {
      Name:this.currentRecordPath.Name, 
      Path:this.currentRecordPath.Path, 
      Password: this.cryptoService.decrypt4DB(this.currentRecordPath.Password), 
      Account:this.cryptoService.decrypt4DB(this.currentRecordPath.Account)
    };
    
  }
  async clickDelete(){
    if(!confirm("Are you sure?"))return;
    try{
      this.flag.busy=true;
      await this.currentRecordPath.destroy();
      this.coreService.notify({path:this.coreService.urls.URL_RECORDPATH, objectId:this.currentRecordPath.id})
      this.reloadRecordPathEvent.emit();
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
      console.debug(this.currentRecordPath);
      this.currentRecordPath.Name = this.editRecordPath.Name;
      this.currentRecordPath.Path = this.editRecordPath.Path;
      this.currentRecordPath.Password = this.cryptoService.encrypt4DB(this.editRecordPath.Password);
      this.currentRecordPath.Account = this.cryptoService.encrypt4DB(this.editRecordPath.Account);
      await this.currentRecordPath.save();
      this.coreService.notify({path:this.coreService.urls.URL_RECORDPATH, objectId:this.currentRecordPath.id})
      this.reloadRecordPathEvent.emit();
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
