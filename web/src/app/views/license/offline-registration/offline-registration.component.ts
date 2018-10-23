import { Component, OnInit, ViewChild, ElementRef, EventEmitter, Output } from '@angular/core';
import { CoreService } from 'app/service/core.service';

@Component({
  selector: 'app-offline-registration',
  templateUrl: './offline-registration.component.html',
  styleUrls: ['./offline-registration.component.css']
})
export class OfflineRegistrationComponent implements OnInit {
  @ViewChild('licenseFile') licenseFile: ElementRef;
  @Output() closeModalEvent: EventEmitter<any> = new EventEmitter();
  @Output() reloadEvent: EventEmitter<any> = new EventEmitter();
  displayProcess: string;
  uploadFileContent: string;
  constructor(private coreService: CoreService) { }

  ngOnInit() {
  }

  // 每次選擇檔案時，讀取該檔案並更新上傳內容
  getFiles(event) {
    this.displayProcess = '';
    const files = event.target.files;
    const reader = new FileReader();
    reader.onload = () => {
      this.uploadFileContent = reader.result;
    };
    reader.readAsText(files[0]);
  }

  /** 將上傳內容轉發給MediaServer */
  clickConfirm() {
    this.displayProcess = 'Processing...';
    this.coreService.proxyMediaServer({
      method: 'POST',
      path: this.coreService.urls.URL_MEDIA_OFFLINE_REGISTRATION,
      body: this.uploadFileContent
    }).map(response => this.receiveConfirmResponse(response))
      .subscribe();
  }

  /** 接收到MediaServer的訊息後做出不同反應 */
  receiveConfirmResponse(response: any) {
    this.displayProcess = this.coreService.getLicenseResponseDescription(response);
    if (this.displayProcess.length === 0) {
      this.reloadEvent.emit();
      this.closeModalEvent.emit();
    }
  }
}
