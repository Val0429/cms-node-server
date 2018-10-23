import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { General, Nvr } from 'app/model/core';
import * as moment from 'moment';
import { Observable } from 'rxjs/Observable';
import { OptionHelper } from 'app/helper/option.helper';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.css']
})
export class GeneralComponent implements OnInit {
  generalSetting: General;
  nvrConfig: Nvr[];
  mailServerIsCollapsed = true;
  ftpServerIsCollapsed = true;
  dynamicStreamProfileIsCollapsed = true;
  decodeIframeIsCollapsed = true;
  videoTitleBarIsCollapsed = true;
  watermarkIsCollapsed = true;
  startupOptionsIsCollapsed = true;
  bandwidthControlIsCollapsed = true;

  dwellTimeOfPatrolOptions = {
    '15 sec': '15',
    '30 sec': '30',
    '45 sec': '45',
    '1min': '60',
    '2min': '120',
    '3min': '180',
    '5min': '300',
    '10min': '600'
  };
  dwellTimeOfPatrolOptionsObject: any;
  localPathOptions = [
    'Desktop', 'My Documents', 'My Pictures'
  ];
  cpuProtectionOptions = [
    '50', '60', '70', '80', '90', '95'
  ];
  autoLockTimer = {
    'Disable': '0',
    '30 sec': '30',
    '1min': '60',
    '2min': '120',
    '3min': '180',
    '5min': '300',
    '10min': '600',
    '15min': '900',
    '30min': '1800',
    '1 hr': '3600',
  };
  autoLockTimerObject: any;
  imageFormatOptions = [
    'jpg', 'tiff'
  ];
  exportFilenameFormat = [
    'S:yyyyMMdd_S:HHmmss_E:HHmmss', 'S:MMddyyyy S:HHmm E:HHmm'
  ];

  /** Export Filename Format實際名稱展示 */
  exportFilenameFormatDemo: string;

  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private cryptoService: CryptoService
  ) { }

  ngOnInit() {
    this.getGeneral()
      .switchMap(() => this.fetchNvr())
      .subscribe();

    // 產生dictionary type的選項
    this.dwellTimeOfPatrolOptionsObject = OptionHelper.getOptions(this.dwellTimeOfPatrolOptions);
    this.autoLockTimerObject = OptionHelper.getOptions(this.autoLockTimer);
  }

  getGeneral() {
    const get$ = Observable.fromPromise(this.parseService.getData({
      type: General
    })).map(general => {
      this.generalSetting = general;
      this.changedExportFilenameFormat();
      this.cryptoGeneral(0).subscribe();
    });
    return get$;
  }

  fetchNvr() {
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr
    })).map(nvrs => this.nvrConfig = nvrs);
    return fetch$;
  }

  clickSaveConfig() {
    if (!this.generalSetting || !this.nvrConfig) {
      return;
    }

    this.convertColorHex();
    // LivePatrolInterval必須限制為5~3600且儲存為string
    this.generalSetting.LivePatrolInterval = this.coreService.inputNumberRange({
      n: Number(this.generalSetting.LivePatrolInterval),
      rangeLow: 5, rangeHigh: 3600
    }).toString();
    this.generalSetting.CPULoadingUpperBoundary = this.coreService.inputNumberRange({
      n: Number(this.generalSetting.CPULoadingUpperBoundary),
      rangeLow: 50, rangeHigh: 95
    }).toString();
    this.generalSetting.AutoLockApplicationTimer = this.coreService.inputNumberRange({
      n: Number(this.generalSetting.AutoLockApplicationTimer),
      rangeLow: 0, rangeHigh: 3600
    }).toString();
    // AutoLockApplicationTimer額外條件: 不可以等於1~29
    const autoLockApplicationTimer = Number(this.generalSetting.AutoLockApplicationTimer);
    if (autoLockApplicationTimer > 0 && autoLockApplicationTimer < 30) {
      this.generalSetting.AutoLockApplicationTimer = '30';
    }

    const saveNvr$ = Observable.fromPromise(Parse.Object.saveAll(this.nvrConfig).then(result => this.coreService.notifyWithParseResult({
      parseResult: result, path: this.coreService.urls.URL_CLASS_NVR
    })));
    const saveGeneral$ = Observable.fromPromise(this.generalSetting.save().then(result => this.coreService.notifyWithParseResult({
      parseResult: [result], path: this.coreService.urls.URL_CLASS_GENERAL
    })));
    this.cryptoGeneral(1)
      .switchMap(() => saveGeneral$)
      .switchMap(() => saveNvr$)
      .map(() => alert('Update Success'))
      .switchMap(() => this.getGeneral())
      .toPromise()
      .catch(alert);
  }

  /** 將色碼轉為符合要求格式 hex 6碼 */
  convertColorHex() {
    if (!this.generalSetting.Watermark.FontColor) {
      this.generalSetting.Watermark.FontColor = '#ffffff';
    }

    // 3碼轉6碼
    if (this.generalSetting.Watermark.FontColor.replace('#', '').length === 3) {
      const seq = this.generalSetting.Watermark.FontColor.replace('#', '').split('');
      this.generalSetting.Watermark.FontColor = `#${seq[0]}${seq[0]}${seq[1]}${seq[1]}${seq[2]}${seq[2]}`;
    }
  }

  /** 將Export Filename Format格式轉換為範例時間 */
  changedExportFilenameFormat() {
    const startTime = moment(moment.utc()).local();
    const endTime = startTime.clone().add(1, 'hour');
    if (this.generalSetting.ExportFileNameFormat === this.exportFilenameFormat[0]) {
      this.exportFilenameFormatDemo = '{Device Name} ' + startTime.format('YYYYMMDD_HHmmss_') + endTime.format('HHmmss');
    } else if (this.generalSetting.ExportFileNameFormat === this.exportFilenameFormat[1]) {
      this.exportFilenameFormatDemo = '{Device Name} ' + startTime.format('MMDDYYYY HHmm ') + endTime.format('HHmm');
    }
  }

  /** 將general物件加解密指定欄位
   * 參數: 0=解密, 1=加密
  */
  cryptoGeneral(flag: number) {
    this.generalSetting.Mail.Account = this.cryptoProcess(flag, this.generalSetting.Mail.Account);
    this.generalSetting.Mail.Password = this.cryptoProcess(flag, this.generalSetting.Mail.Password);
    this.generalSetting.Ftp.Account = this.cryptoProcess(flag, this.generalSetting.Ftp.Account);
    this.generalSetting.Ftp.Password = this.cryptoProcess(flag, this.generalSetting.Ftp.Password);
    return Observable.of(null);
  }

  /** 加解密文字 */
  cryptoProcess(flag: number, item: string) {
    if (!item) {
      return;
    }
    return flag === 0
      ? this.cryptoService.decrypt4DB(item)
      : this.cryptoService.encrypt4DB(item);
  }
}
