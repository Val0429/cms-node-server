import { Component, OnInit, Output, EventEmitter, Input} from "@angular/core";
import { NvrService } from "app/service/nvr.service";
import { Nvr, Device, PagerClass } from "app/model/core";
import { ISelectorNvrModel } from "../event.component";
import { CameraService } from "app/service/camera.service";

@Component({
    selector: 'app-device-selector',
    templateUrl: './device-selector.component.html',
    styleUrls: ['./device-selector.component.css']
  })
export class DeviceSelectorComponent  implements OnInit{
    selectorNvrList: ISelectorNvrModel[];
    paging:PagerClass = new PagerClass();
    
    @Output() selectedCallBack:EventEmitter<any> = new EventEmitter();
    constructor(private nvrService:NvrService, private cameraService:CameraService){        
    }
    @Input() streamMode:boolean=true;
    @Input() currentAction:any;
    async ngOnInit(){
        await this.fetchNvrs();
    }
    async pageChange(event:number){
        this.paging.page = event;
        await this.fetchNvrs();
      }
    selectStream($event:any){
        let selectedStreamId=parseInt($event.target.value);
        this.currentAction.DigitalOutputId=selectedStreamId; 
        if(this.streamMode===true){
            this.selectedCallBack.emit(this.currentAction);
        }
    }
    selectDevice(device:Device){   
        this.currentAction.DeviceId=device.Channel; 
        this.currentAction.NvrId=device.NvrId;
        if(this.streamMode!==true){
            this.selectedCallBack.emit(this.currentAction);
        }
    }
    async cameraPageChange(target:ISelectorNvrModel, event:number){
        target.page = event;
        target.Devices=[];
        let devices = await this.cameraService.getDevice(target.Data.Id, target.page, this.paging.pageSize);
        devices.forEach(device => {          
          target.Devices.push({ Data: device, EventHandler: undefined });
        });
      }
    private async fetchNvrs() {    
        const getNvrs$ = this.nvrService.getNvrList(this.paging.page, this.paging.pageSize).then(async (nvrs) => {
          
          this.selectorNvrList=[];
          let promises = [];
          for (let nvr of nvrs) {
            const newObj: ISelectorNvrModel = {
              Data: nvr, Devices: [], isCollapsed: true, page: 1, total: 0
            };
            let getDevice$ = this.cameraService.getDevice(nvr.Id, 1, this.paging.pageSize).then(devices => {
              devices.forEach(device => {                
                newObj.Devices.push({ Data: device, EventHandler: undefined });
              });
            });
            let getDeviceCount$ = this.cameraService.getDeviceCount(nvr.Id).then(res => newObj.total = res);
            this.selectorNvrList.push(newObj);
            promises.push(getDevice$);
            promises.push(getDeviceCount$);
          }
          
          await Promise.all(promises);
        });
    
        const getNvrsCount$ = this.nvrService.getNvrCount().then(res=>this.paging.total=res);
        await Promise.all([getNvrs$, getNvrsCount$]);
      }
  }

