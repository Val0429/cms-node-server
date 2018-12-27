import { Component, OnInit, Input, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import * as _ from 'lodash';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { OptionHelper } from 'app/helper/option.helper';
import { ParseService } from 'app/service/parse.service';
import { LicenseService } from 'app/service/license.service';
import { CameraService } from 'app/service/camera.service';
import { GroupService } from 'app/service/group.service';
import { CameraEditorParam } from 'app/model/camera-editor-param';
import { StringHelper } from 'app/helper/string.helper';
import { Device, Group, Nvr } from 'app/model/core';
import { IDeviceStream } from 'lib/domain/core';
import { Select2OptionData } from 'ng2-select2/ng2-select2';
import { Observable } from 'rxjs/Observable';


@Component({
  selector: 'app-camera-editor',
  templateUrl: './camera-editor.component.html',
  styleUrls: ['./camera-editor.component.css']
})
export class CameraEditorComponent implements OnInit, OnChanges {
  @Input() currentCamera: Device;
  @Output() reloadDataEvent: EventEmitter<any> = new EventEmitter();
  brandList = DeviceVendor; // 固定list
  modelList: string[]=[];
  
  editorParam: CameraEditorParam;
  /** 當前畫面展開的PTZ Command類型 */
  ptzDisplayType: string;
  ptzPresets: any[]; 
  noGroup:Group;   
  @Input() groupList: Group[]; // 所有group資料
  groupOptions: Select2OptionData[]; // group群組化選項物件
  selectedSubGroup: string; // Camera當前選擇的group物件
  /** Driver=IPCamera的Nvr.Id */
  @Input() ipCameraNvr: Nvr;
  /** currentCamera的Tags陣列在編輯畫面上的string */
  tags: string;
  flag = {
    save: false,
    delete: false
  };

  constructor(
    private cameraService: CameraService,
    private groupService: GroupService
  ) { }

  ngOnInit() {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentCamera) {
      this.currentCamera = changes.currentCamera.currentValue;      
      if (!this.currentCamera) {
        return;
      }
      
      this.noGroup = this.groupList.find(x=>x.Name=="Non Main Group");
      this.groupOptions = this.groupService.getGroupOptions(this.groupList);

      this.tags = this.currentCamera.Tags ? this.currentCamera.Tags.join(',') : '';
      this.setDefaultBrand();
      
    }
  }

  setDefaultBrand() {
    if (!this.currentCamera) {
      return;
    }

    if (!this.currentCamera.Config.Brand) {
      this.currentCamera.Config.Brand = this.brandList[0].Name;
    }

    this.getCapability(this.currentCamera.Config.Brand);
    let selectedSubGroup = this.groupService.findDeviceGroup(this.groupList, 
      { Nvr: this.currentCamera.NvrId, Channel: this.currentCamera.Channel });      
      //if no group found set to "Non Sub Group" group #for version 3.00.25 and above
      this.selectedSubGroup = selectedSubGroup ? selectedSubGroup.id : this.noGroup.SubGroup[0];
  }

  /** 改變Brand的流程 */
  onChangeBrand(brand: string) {
    console.debug("this.editorParam", this.editorParam);
    // 將已存在的stream rtsp port依照brand改為預設值
    const defaultRTSPPort = this.editorParam.getDefaultRTSPPort();
    this.currentCamera.Config.Stream.forEach(str => {
      str.Port.RTSP = defaultRTSPPort;
    });
    
    this.getCapability(brand);
  }
  
  /** 取得Model Capability */
  async getCapability(brand: string) {
    this.modelList=[];
    await this.cameraService.getCapability(this.currentCamera,brand,this.modelList).toPromise();
    this.onChangeModel(this.currentCamera.Config.Model); 
  }

  onChangeModel(model: string) {
    if (model) {
      this.editorParam = this.cameraService.getCameraEditorParam(model, this.currentCamera);
      this.onChangeDynamicOptions();
      this.setCustomizationProcess();
    } else {
      this.editorParam = undefined;
    }
  }
  setCustomizationProcess() {
    if (this.currentCamera.Config.Brand.toLowerCase() === 'customization') {
      this.ptzPresets = OptionHelper.getOptions(this.currentCamera.CameraSetting.PTZCommands);
     
      // this.currentCamera.Config.Stream = [this.currentCamera.Config.Stream[0]];
      this.currentCamera.Config.Stream.forEach(str => {
        if (str.RTSPURI) {
          var parse = require('url-parse'), url = parse(str.RTSPURI, true);          
          str.RTSPURI = url.pathname;
          console.debug("parser", url);
        }
      });

    } else {
      this.ptzPresets = undefined;
    }
  }

  // 改變Mode資料後影響Stream和動態選單
  onChangeMode() {
    this.editorParam.getDynamicOptions();
    this.onChangeDynamicOptions();
  }

  // 重新取得當前VideoStreamProfile應套用的Param
  onChangeDynamicOptions() {
    this.editorParam.getCurrentStreamParam();
  }

  /** 點擊save(新增/修改) */
  async clickSave() {    
    await this.saveCamera();    
  }

  /** 儲存Camera */
  async saveCamera() {
    if(!this.currentCamera.Name){
      alert("Brand name is required");
      return;
    }    
    try{
      this.flag.save = true;
      let result = await this.cameraService.saveCamera(this.currentCamera, this.ipCameraNvr, this.selectedSubGroup, this.editorParam, this.tags);
      console.debug("save result", result);
      alert('Update Success');
      this.reloadDataEvent.emit();
    }catch(err){
      alert(err);
    }
    finally{
      this.flag.save = false;
    }
  }
  
  
  async clickDelete() {
    if (!confirm('Are you sure to delete this Camera?')) return;
      
      try{
        this.flag.delete = true;
        await this.cameraService.deleteCam([this.currentCamera.id], this.ipCameraNvr.id)           
        this.reloadDataEvent.emit();        
      }catch(err){
        console.error(err);
        alert(err);
      }finally{
        this.flag.delete=false;
      }    
  }
  
  checkDisplayAuthentication() {
    let result = true;
    const brand = this.currentCamera.Config.Brand.toLowerCase();
    const model = this.currentCamera.Config.Model.toLowerCase();
    if (brand === 'isapsolution' && model === 'cloud camera') {
      result = false;
    }
    return result;
  }

  /** For ArecontVision's special screen range selector */
  getMaxResolutionOption(index: number) {
    const options = this.editorParam.getResolutionOptionsByStreamId(index).map(x => {
      const seq = x.split(/x|-/);
      return { Width: Number(seq[0]), Height: Number(seq[1]) };
    });
    let maxOpt = { Width: 0, Height: 0 };
    options.forEach(opt => {
      if (opt.Width >= maxOpt.Width && opt.Height >= maxOpt.Height) {
        maxOpt = opt;
      }
    });
    return `${maxOpt.Width}x${maxOpt.Height}`;
  }

  getCurrentRegionPosition(stream: IDeviceStream) {
    return {
      X: stream.Video.RegionStartPointX ? Number(stream.Video.RegionStartPointX) : 0,
      Y: stream.Video.RegionStartPointY ? Number(stream.Video.RegionStartPointY) : 0
    };
  }

  currentRegionCoordinateEvent(stream: IDeviceStream, $event: { X: number, Y: number }) {
    if (!$event) {
      return;
    }
    stream.Video.RegionStartPointX = $event.X;
    stream.Video.RegionStartPointY = $event.Y;
  }
}
