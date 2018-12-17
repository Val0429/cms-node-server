import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ILicenseInfo, ILicenseAdaptor } from 'lib/domain/core';
import { ServerInfo } from 'app/model/core';
@Component({
  selector: 'app-online-registration',
  templateUrl: './online-registration.component.html',
  styleUrls: ['./online-registration.component.css']
})
export class OnlineRegistrationComponent implements OnInit {
  @Input() licenseInfo: ILicenseInfo;
  @Input() currentServer:ServerInfo;
  @Output() closeModalEvent: EventEmitter<any> = new EventEmitter();
  @Output() reloadEvent: EventEmitter<any> = new EventEmitter();
  @ViewChild('inputKey1') inputKey1: ElementRef;
  @ViewChild('inputKey2') inputKey2: ElementRef;
  @ViewChild('inputKey3') inputKey3: ElementRef;
  @ViewChild('inputKey4') inputKey4: ElementRef;
  @ViewChild('inputKey5') inputKey5: ElementRef;
  /** License Key */
  // onlineKey: string[];
  currentAdaptorDesc: string;
  currentAdaptor: ILicenseAdaptor;
  adaptorOptions: { key: string; value: ILicenseAdaptor }[] = [];
  displayProcess: string;
  constructor(private coreService: CoreService) { }

  ngOnInit() {
    this.initEthernetCard();
    this.initInputData();
  }

  /** 取得當前網路卡及選項, key:網卡, value:MAC */
  initEthernetCard() {
    console.debug("initEthernetCard", this.currentServer);
    if (this.licenseInfo) {
      this.adaptorOptions = [];
      this.licenseInfo.Adaptor.forEach(adp => {
        this.adaptorOptions.push({
          key: adp.Description, value: adp
        });
      });
    }
  }

  /** 註冊資料初始化 */
  initInputData() {
    try {
      this.inputKey1.nativeElement.value = '';
      this.inputKey2.nativeElement.value = '';
      this.inputKey3.nativeElement.value = '';
      this.inputKey4.nativeElement.value = '';
      this.inputKey5.nativeElement.value = '';
    } catch (error) { }

    this.currentAdaptor = undefined;
    this.currentAdaptorDesc = '';
  }

  /** 從輸入框取得License Key */
  getLicenseKeyFromUI(): string[] {
    return [
      this.inputKey1.nativeElement.value,
      this.inputKey2.nativeElement.value,
      this.inputKey3.nativeElement.value,
      this.inputKey4.nativeElement.value,
      this.inputKey5.nativeElement.value
    ];
  }

  /** 檢查License長度，未來視情況加上字元判斷 */
  checkLicenseFormat() {
    const keys = this.getLicenseKeyFromUI();
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].length !== 5) {
        alert('Please verify your license format.');
        return false;
      }
    }
    return true;
  }

  /** 點擊確認事件，送出LicenseKey */
  clickConfirm() {
    if (!this.checkLicenseFormat()) {
      return;
    }
    if (!this.currentAdaptor) {
      alert('Please select an ethernet card.');
      return;
    }
    this.displayProcess = 'Processing...';
    const body = `key=${this.getLicenseKeyFromUI().join('-')}&mac=${this.currentAdaptor.MAC}`;
    this.coreService.proxyMediaServer({
      method: 'POST',
      path: this.coreService.urls.URL_MEDIA_ONLINE_REGISTRATION,
      body: body
    }, 5000, this.currentServer.id).map(response => this.receiveConfirmResponse(response))
      .subscribe();
  }

  /** 點擊清除事件 */
  clickClear() {
    this.initInputData();
  }

  selectAdaptor() {
    this.currentAdaptor = this.adaptorOptions.find(x => x.key === this.currentAdaptorDesc).value;
  }

  /** 接收到MediaServer的訊息後做出不同反應 */
  receiveConfirmResponse(response: any) {
    this.displayProcess = this.coreService.getLicenseResponseDescription(response);
    if (this.displayProcess.length === 0) {      
      this.displayProcess = "Registration succeeded!";
      this.initInputData();
      this.reloadEvent.emit();
      this.closeModalEvent.emit();
      this.displayProcess = "";      
    }
  }

  /** License Key輸入事件 */
  checkChangeFocus($event: any) {
    const allValue = $event.target.value.replace(/ |-/gi, ''); // 將所有空白字元與'-'清除
    this.setInputKey($event.target, allValue);
  }

  /** 設定license輸入框內容, 長度超過5則自動將剩餘內容轉到下一輸入框 */
  setInputKey(target: any, value: string) {
    target.value = value.substring(0, 5);
    const nextTarget = this.findNextInputTarget(target);

    if (value.length > 4 && nextTarget) {
      nextTarget.focus();
      this.setInputKey(nextTarget, value.substring(5));
    }
  }

  /** 依照目前targetId尋找下一個輸入框 */
  findNextInputTarget(target: any) {
    if (!target) {
      return undefined;
    }

    const targetId = target.id.replace('inputKey', '');
    switch (targetId) {
      case '1': return this.inputKey2.nativeElement;
      case '2': return this.inputKey3.nativeElement;
      case '3': return this.inputKey4.nativeElement;
      case '4': return this.inputKey5.nativeElement;
      default: return undefined;
    }
  }
}
