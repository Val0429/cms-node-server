import { Component, OnInit, Input, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import * as _ from 'lodash';
import { DeviceVendor } from 'app/config/device-vendor.config';
import { OptionHelper } from 'app/helper/option.helper';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { LicenseService } from 'app/service/license.service';
import { CryptoService } from 'app/service/crypto.service';
import { CameraService } from 'app/service/camera.service';
import { GroupService } from 'app/service/group.service';
import { CameraEditorParam } from 'app/model/camera-editor-param';
import { StringHelper } from 'app/helper/string.helper';
import { Device, Group, Nvr, RecordSchedule, EventHandler } from 'app/model/core';
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
  modelList: string[];
  editorParam: CameraEditorParam;
  /** 當前畫面展開的PTZ Command類型 */
  ptzDisplayType: string;
  ptzPresets: any[];
  groupList: Group[]; // 所有group資料
  groupOptions: Select2OptionData[]; // group群組化選項物件
  selectedSubGroup: string; // Camera當前選擇的group物件
  /** Driver=IPCamera的Nvr.Id */
  ipCameraNvr: Nvr;
  /** currentCamera的Tags陣列在編輯畫面上的string */
  tags: string;
  flag = {
    save: false,
    delete: false
  };

  constructor(
    private coreService: CoreService,
    private cameraService: CameraService,
    private groupService: GroupService,
    private parseService: ParseService,
    private cryptoService: CryptoService,
    private licenseService: LicenseService
  ) { }

  ngOnInit() {
    const getGroup$ = Observable.fromPromise(this.parseService.fetchData({
      type: Group
    }).then(groups => {
      this.groupList = groups;
      this.groupOptions = this.groupService.getGroupOptions(this.groupList);
    }));

    const getNvrId$ = Observable.from(this.parseService.getData({
      type: Nvr,
      filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
    })).map(nvr => this.ipCameraNvr = nvr);

    getGroup$
      .switchMap(() => getNvrId$)
      .toPromise()
      .catch(alert);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentCamera) {
      this.currentCamera = changes.currentCamera.currentValue;
      if (!this.currentCamera) {
        return;
      }
      this.tags = this.currentCamera.Tags ? this.currentCamera.Tags.join(',') : '';
      this.setDefaultBrand();
    }
  }

  setDefaultBrand() {
    if (!this.currentCamera) {
      return;
    }

    if (StringHelper.isNullOrEmpty(this.currentCamera.Config.Brand)) {
      this.currentCamera.Config.Brand = this.brandList[0].Name;
    }

    this.getCapability(this.currentCamera.Config.Brand);
    this.selectedSubGroup = this.groupService.findDeviceGroup(this.groupList,
      { Nvr: this.currentCamera.NvrId, Channel: this.currentCamera.Channel });
  }

  /** 改變Brand的流程 */
  onChangeBrand(brand: string) {
    // 將已存在的stream rtsp port依照brand改為預設值
    const defaultRTSPPort = this.editorParam.getDefaultRTSPPort();
    this.currentCamera.Config.Stream.forEach(str => {
      str.Port.RTSP = defaultRTSPPort;
    });
    this.getCapability(brand);
  }

  /** 取得Model Capability */
  getCapability(brand: string) {
    this.modelList = undefined;

    const vendor = this.brandList.find(x => x.Name === brand);
    const data = {
      fileName: vendor.FileName
    };
    this.coreService.postConfig({ path: this.coreService.urls.URL_BRAND_CAPABILITY, data: data })
      .map(result => this.cameraService.currentBrandCapability = result)
      .map(() => {
        this.modelList = this.cameraService.getModelList();
        // If no value or not on list, set value to first option
        if (StringHelper.isNullOrEmpty(this.currentCamera.Config.Model)
          || this.modelList.indexOf(this.currentCamera.Config.Model) < 0) {
          this.currentCamera.Config.Model = this.modelList[0];
        }
        this.onChangeModel(this.currentCamera.Config.Model);
      })
      .subscribe();
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
          const seq = str.RTSPURI.split('/');
          str.RTSPURI = seq[seq.length - 1];
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
  clickSave() {
    this.licenseService.getLicenseAvailableCount('00171')
      .map(num => {
        if (num < 0) {
          alert('License available count is not enough, can not save data.');
          return;
        }
        this.saveCamera();
      })
      .subscribe();
  }

  /** 儲存Camera */
  saveCamera() {
    this.flag.save = true;

    this.currentCamera.Name = this.coreService.stripScript(this.currentCamera.Name);
    this.currentCamera.Tags = this.tags.split(',');
    // this.currentCamera.Tags = this.tags.replace(/ /g, '').split(',');
    this.editorParam.getStreamSaveNumberBeforeSave();
    this.editorParam.getResolutionBeforeSave();
    this.editorParam.removeAttributesBeforeSave();

    // 加密
    this.currentCamera.Config.Authentication.Account = this.cryptoService.encrypt4DB(this.currentCamera.Config.Authentication.Account);
    this.currentCamera.Config.Authentication.Password = this.cryptoService.encrypt4DB(this.currentCamera.Config.Authentication.Password);

    // 將RTSPURI組合完整
    if (this.currentCamera.Config.Brand === 'Customization') {
      this.currentCamera.Config.Stream.forEach(str => {
        str.RTSPURI = `rtsp://${this.currentCamera.Config.IPAddress}:${str.Port.RTSP}/${str.RTSPURI || ''}`;
      });
    }

    const save$ = Observable.fromPromise(this.currentCamera.save())
      .map(result => {
        this.coreService.addNotifyData({
          path: this.coreService.urls.URL_CLASS_NVR,
          objectId: this.ipCameraNvr.id
        });
        return this.coreService.notifyWithParseResult({
          parseResult: [result], path: this.coreService.urls.URL_CLASS_DEVICE
        });
      });
    save$
      .switchMap(() => this.groupService.setChannelGroup(this.groupList,
        { Nvr: this.ipCameraNvr.Id, Channel: this.currentCamera.Channel }, this.selectedSubGroup))
      .map(() => {
        alert('Update Success');
        this.reloadDataEvent.emit();
      })
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  clickDelete() {
    if (confirm('Are you sure to delete this Camera?')) {
      this.flag.delete = true;

      const delete$ = Observable.fromPromise(this.currentCamera.destroy())
        .map(result => {
          this.coreService.addNotifyData({
            path: this.coreService.urls.URL_CLASS_NVR,
            objectId: this.ipCameraNvr.id
          });
          this.coreService.addNotifyData({
            path: this.coreService.urls.URL_CLASS_DEVICE,
            objectId: this.currentCamera.id
          });
        });

      // 刪除與此Camera相關的RecordSchedule
      const removeRecordSchedule$ = Observable.fromPromise(this.parseService.fetchData({
        type: RecordSchedule,
        filter: query => query
          .equalTo('NvrId', this.currentCamera.NvrId)
          .equalTo('ChannelId', this.currentCamera.Channel)
      }))
        .switchMap(schedules => Observable.fromPromise(Parse.Object.destroyAll(schedules)))
        .map(results => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_RECORDSCHEDULE, dataArr: results }));

      // 刪除與此Camera相關的EventHandler
      const removeEventHandler$ = Observable.fromPromise(this.parseService.fetchData({
        type: EventHandler,
        filter: query => query
          .equalTo('NvrId', this.ipCameraNvr.Id)
          .equalTo('DeviceId', this.currentCamera.Channel)
      }))
        .switchMap(handler => Observable.fromPromise(Parse.Object.destroyAll(handler)))
        .map(results => this.coreService.notifyWithParseResult({
          parseResult: results, path: this.coreService.urls.URL_CLASS_EVENTHANDLER
        }));

      delete$
        .switchMap(() => removeRecordSchedule$)
        .switchMap(() => removeEventHandler$)
        .switchMap(() => this.groupService.setChannelGroup(
          this.groupList, { Nvr: this.ipCameraNvr.Id, Channel: this.currentCamera.Channel }, undefined))
        .map(() => this.reloadDataEvent.emit())
        .toPromise()
        .catch(alert)
        .then(() => this.flag.delete = false);
    } else {
      return;
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
