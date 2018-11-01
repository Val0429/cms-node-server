import { Component, OnInit, Input, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import { IServerStorage } from 'lib/domain/core';
import MediaDiskHelper from 'app/helper/media-disk.helper';

@Component({
  selector: 'app-disk-space',
  templateUrl: './disk-space.component.html',
  styleUrls: ['./disk-space.component.css']
})
export class DiskSpaceComponent implements OnInit, OnChanges {
  /** ServerConfig.Storage */
  @Input() storageConfig: IServerStorage[];
  /** 所有可選擇的硬碟 */
  @Input() mediaDiskspace: any;
  /** 返回Storage應儲存內容的call back */
  @Output() setStorageEvent: EventEmitter<IServerStorage> = new EventEmitter();
  /** 暫存勾選storage disk物件，儲存時取代ServerConfig.Storage內容 */
  tempSave: IServerStorage;
  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.storageConfig) {
      this.storageConfig = changes.storageConfig.currentValue
        ? changes.storageConfig.currentValue : [];
    }
    if (changes.mediaDiskspace) {
      this.mediaDiskspace = changes.mediaDiskspace.currentValue;
      this.initTempSave();
    }
  }

  /** 初始化暫存物件 */
  initTempSave() {
    if (!this.mediaDiskspace) {
      return;
    }
    this.tempSave = this.storageConfig &&  this.storageConfig.length>0 ? this.storageConfig[0] : null;
    console.log("this.tempSave",this.tempSave);
    
  }

  /** 增刪已選擇的硬碟 for layout操作 */
  setDiskStorage(disk: any) {
    const letter = this.getDiskLetterCode(disk); // 硬碟代號 ex: 'C'
    
      // insert new disk config into currect index
      this.tempSave = {
        Keepspace: '0',        
        Path: `${letter}:` + `\\CMSRecord\\`
      };
       
    this.setStorageEvent.emit(this.tempSave);
    
  }

  /** 檢查可選的硬碟是否已被勾選 */
  checkDiskSelected(disk: any): boolean {
    if (!this.storageConfig || !this.tempSave) {
      return false;
    }
    return this.tempSave.Path.indexOf(disk.Letter) >= 0;
    
  }

  // 從可選擇的Disk資料中取得硬碟代號 ex:'C'
  getDiskLetterCode(disk: any) {
    return disk.Letter.split(':')[0];
  }

  /** 從已選擇的Disk資料中取得硬碟代號 ex:'C' */
  getStoragePathCode(storage: IServerStorage) {
    return storage.Path.split(':')[0];
  }

  /** 換算Bytes到適當單位 */
  countBytes(bytes: string): string {
    return MediaDiskHelper.countBytes(bytes);
  }

  /** 計算硬碟使用量 */
  countUsageSpace(disk: any): string {
    return MediaDiskHelper.countUsageSpace(disk);
  }

  /** 計算硬碟使用量百分比 */
  countUsagePercent(disk: any): string {
    return MediaDiskHelper.countUsagePercent(disk);
  }
}
