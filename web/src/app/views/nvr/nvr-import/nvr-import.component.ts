import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Group, Nvr } from 'app/model/core';
import { CryptoService } from 'app/service/crypto.service';
import { ParseService } from 'app/service/parse.service';
import { NvrService } from 'app/service/nvr.service';
import { CameraService } from 'app/service/camera.service';
import { LicenseService } from 'app/service/license.service';
import { environment } from 'environments/environment';
import { CSVService } from 'app/service/csv.service';
import { stringify } from 'querystring';
// see: https://stackoverflow.com/a/46745059/1016343
@Component({
  selector: 'app-nvr-import',
  templateUrl: './nvr-import.component.html',
  styleUrls: ['./nvr-import.component.css']
})
export class NvrImportComponent  implements OnInit {
    p=1;
    @Input() flag:{busy:boolean};
    @Output() closeModal: EventEmitter<any> = new EventEmitter();
    @Output() reloadDataEvent: EventEmitter<any> = new EventEmitter();
    @Input() groupList:Group[];
    @ViewChild('form') form;
    importGroups:Group[]=[];
    nvrList:NvrImportInterface[]=[];
    anyChecked:boolean=false;
    totalValidNvr:number=0;
    nonGroup: Group;
    checkedAll: boolean;
    headers: any[];
    constructor(private cryptoService:CryptoService, 
        private licenseService:LicenseService,
        private cameraService:CameraService,
        private nvrService:NvrService,
        private csvService:CSVService,
        private parseService:ParseService){}
    ngOnInit(){
    }

    async onFileLoad(result:any) { 
                
        try{              
            let allTextLines = result.split(/\r|\n|\r/);
            let header = allTextLines.splice(0,1);
            this.nonGroup = this.groupList.find(x=>x.Name =="Non Sub Group");
            this.headers = header[0].split(',');
            let promises=[];
            allTextLines.forEach(item => {
                // split content based on comma
                let data = item.replace(/\"/g,"").replace(/\'/g,"").split(',');                          
                if(data.length< this.headers.length)return; 
                try{
                    let newItem = this.convertToNvr(data);                
                    let promise = this.checkImportStatus(newItem).then(()=>{
                        newItem.checked=newItem.error.length==0;
                        this.nvrList.push(newItem);
                    });     
                    promises.push(promise);
                }catch(err2){
                    console.error(err2);
                }
            });
                
            await Promise.all(promises);
            this.totalValidNvr = this.nvrList.filter(x=>x.error.length==0).length;
            this.checkSelected();
        }catch(err){
            alert("Unable to read the file");
            console.error(err);
        }
    }
    private resetImport() {
        this.nvrList = [];
        this.totalValidNvr = 0;
        this.p = 1;
        this.anyChecked = false;
        this.checkedAll = false;
        this.importGroups=[];
    }

    selectNvr(item:NvrImportInterface, checked:boolean){
        this.nvrList.find(x=>x == item).checked = checked;
        this.checkSelected();
    }
    selectAll(checked:boolean){    
        for(let nvr of this.nvrList.filter(x=>x.error.length==0 && !x.nvrObjectId)){
          nvr.checked=checked;
        }
        this.checkSelected();
      }
    checkSelected(){
        let checked = this.nvrList.filter(x=>x.error.length==0).map(e=>e.checked);
        //console.debug("checked",checked);
        this.checkedAll = checked.length > 0 && checked.indexOf(undefined) < 0 && checked.indexOf(false) < 0;
        this.anyChecked = checked.length > 0 && checked.indexOf(true) >= 0;
        console.debug("this.checkedAll",this.checkedAll);
        console.debug("this.anyChecked",this.anyChecked);
      }
    async checkImportStatus(newItem:NvrImportInterface){
        let existInDb = await this.parseService.fetchData({type:Nvr, filter:q=>q.equalTo("Domain", newItem.nvr.Domain)
            .equalTo("Port", newItem.nvr.Port).limit(1)});
        let existInList = this.nvrList.find(x=>x.nvr.Domain == newItem.nvr.Domain && x.nvr.Port == newItem.nvr.Port);        
        
        if(existInDb && existInDb.length>0) newItem.error.push("exist in db");
        if(existInList) newItem.error.push("duplicate import");
        if(!newItem.group) newItem.error.push("group doesn't exist");
        else {            
            let findInImportGroups = this.importGroups.find(x=>x == newItem.group);
            if(!findInImportGroups)this.importGroups.push(newItem.group);
        }
        
    }
    close(){
        this.resetImport();
        this.form.nativeElement.reset();
        this.reloadDataEvent.emit();
        this.closeModal.emit();
    }
    async saveAll(){    
        if (!confirm("Import and sync selected NVR(s)?")) return;
        try{
          this.flag.busy=true;
          let promiseImports=[];
          let checkedList = this.nvrList.filter(x=>x.checked===true);
          //console.debug("saved nvrs", checkedList);
          //gives Id now otherwise there will be duplicate Id due to parallel requests
          let ids = await this.nvrService.getNewNvrId(checkedList.length);          
          for(let i=0;i<checkedList.length;i++){
            checkedList[i].nvr.Id=ids[i].toString();
            checkedList[i].nvr.SequenceNumber=ids[i];
          }
          for(let group of this.importGroups){
              let items = checkedList.filter(x=>x.group == group);
              if(!items || items.length==0)continue;    
              let nvrs=items.map(x=>x.nvr);              
              let promise = this.nvrService.saveNvr(nvrs, items[0].group.id).then(nvrImportResults=>{
                for(let item of items){
                    let find= nvrImportResults.find(x=>x.Domain == item.nvr.Domain && x.Port == item.nvr.Port);
                    if(!find)continue;
                    item.nvrObjectId = find.objectId;
                    item.nvr.Id = find.Id;                    
                }
              });
              promiseImports.push(promise);
          }
          await Promise.all(promiseImports);
          let promiseSyncDevice=[];
          for(let item of checkedList){              
              promiseSyncDevice.push(this.getDevice(item).then(()=>item.checked=false));
          }
          await Promise.all(promiseSyncDevice);
          this.checkSelected();
          if(confirm("Import NVR(s) success, export result?")) this.exportAll();      
        }catch(err){
          console.error(err);
          alert(err);
        }finally{      
          this.flag.busy=false;      
        }
      }
      async getDevice(item:NvrImportInterface){
        try{
            const lic = environment.production ? this.licenseService.getNvrManufacturerLicenseCode(item.nvr.Manufacture) : "pass";
            console.debug(lic);
            let num = await this.licenseService.getLicenseAvailableCount(lic).toPromise();

            await this.nvrService.getNvrDevice(item.nvr.Id).then(async devices => {                
                if(num<devices.length)item.syncResult=`insufficient license for ${devices.length} device(s)`;
                else{
                    await this.cameraService.saveCamera(devices, item.nvr.Id, item.nvrObjectId, undefined, "").then(cams=> {
                        item.deviceSynced = cams.length;
                        item.syncResult="success";
                    }); 
                }
            });
        }
        catch(err){
            item.syncResult="failed";
            console.debug(err);
        }
      }
      exportAll(){
        this.csvService.downloadCSV({
            header: this.headers.join(",")+`,error,"import result",ID,"sync result","device synced"`,
            data: this.nvrList.map(item => `${item.nvr.Name},${item.nvr.Manufacture},${item.nvr.Driver},${item.nvr.Domain},${item.nvr.Port},${item.nvr.ServerPort},${item.nvr.Account},${item.nvr.Password},${item.nvr.SSLEnable},${item.nvr.IsListenEvent},${item.nvr.BandwidthStream},${item.nvr.ServerStatusCheckInterval},${item.group? item.group.Name:''},"${item.nvr.Tags.join(",")}","${item.error.join(",")}",${item.nvrObjectId?'success':''},${item.nvr.Id || ""},${item.syncResult ||""},${item.deviceSynced || ""}`),
            fileName: 'import_result'
          });
      }
    convertToNvr(data: string[]):NvrImportInterface {
        let i=0;
        var nvr = new Nvr();        
        nvr.Name=data[i++];
        nvr.Manufacture=data[i++];
        nvr.Driver=data[i++];
        nvr.Domain=data[i++];
        nvr.Port=Number.parseInt(data[i++]);
        nvr.ServerPort=Number.parseInt(data[i++] || "8000");        
        nvr.Account=this.cryptoService.encrypt4DB(data[i++]);
        nvr.Password=this.cryptoService.encrypt4DB(data[i++]);
        nvr.SSLEnable=data[i++].toLowerCase() == "true";
        nvr.IsListenEvent=data[i++].toLowerCase() == "true";
        nvr.BandwidthStream=Number.parseInt(data[i++]);
        nvr.ServerStatusCheckInterval=Number.parseInt(data[i++]);
        let groupName = data[i++];
        nvr.Tags=data.splice(i, data.length-i);
        let group = groupName ? this.groupList.find(x=>x.Name==groupName && x.Level=="1") : this.nonGroup;
        let newItem:NvrImportInterface={error:[],checked:false, group, nvr}
        return newItem;
    }

    onFileSelect(input: HTMLInputElement) {

        const files = input.files;

        if (files && files.length) {
            this.resetImport(); 
            console.debug("Filename: " + files[0].name);
            console.debug("Type: " + files[0].type);
            console.debug("Size: " + files[0].size + " bytes");
            if(files[0].type!=="application/vnd.ms-excel"){
                alert("Invalid file format!");
                return;
            }

            const fileToRead = files[0];

            const fileReader = new FileReader();
            fileReader.onloadend = ()=>{
                this.onFileLoad(fileReader.result);
            }

            fileReader.readAsText(fileToRead, "UTF-8");
        }

    }
}
interface NvrImportInterface{
    checked:boolean;
    error:string[];
    nvr:Nvr; 
    group:Group;
    syncResult?:string;
    deviceSynced?:number;    
    nvrObjectId?:string;
}