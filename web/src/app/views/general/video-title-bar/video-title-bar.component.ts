import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-video-title-bar',
  templateUrl: './video-title-bar.component.html',
  styleUrls: ['./video-title-bar.component.css']
})
export class VideoTitleBarComponent implements OnInit, OnChanges {
  @Input() titleBarInformations: IVideoTitleBar;
  titleBarList = [
    'Resolution', 'CameraName', 'Compression', 'FPS', 'Bitrate', 'DateTime'
  ];
  editDataModel: TitleBarInformationItem[];
  constructor() { }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.titleBarInformations) {
      this.titleBarInformations = changes.titleBarInformations.currentValue;
      this.generateEditModel();
    }
  }

  generateEditModel() {
    this.editDataModel = [];
    this.titleBarList.forEach(item => {
      const savedItem = this.titleBarInformations.Informations.find(x => x.Type === item);
      if (savedItem) {
        this.editDataModel.push(savedItem);
      } else {
        this.editDataModel.push({ Seq: '', Type: item });
      }
    });
  }

  // 取得TitleBar Item啟用與否的顯示icon class
  getTitleBarItemIconClasses(seq: string): string[] {
    const classes = ['thumb-sm', 'mr', 'glyphicon'];
    if (seq !== '') {
      classes.push('glyphicon-check');
    } else {
      classes.push('glyphicon-unchecked');
    }
    return classes;
  }

  // 點擊TitleBar Item的動作
  clickTitleBarItem(item: any) {
    if (item.Seq !== '') {
      item.Seq = '';
    } else {
      item.Seq = '1'; // 隨便給個數字，目的是告訴程式此item被打勾即可
    }
    this.arrangeItemSequence();
  }

  /** 重新編排TitleBar Item的Sequence順序 */
  arrangeItemSequence() {
    if (!this.editDataModel) {
      return;
    }
    let currentSeq = 1;
    this.editDataModel.forEach(item => {
      if (item.Seq !== '') {
        item.Seq = currentSeq.toString();
        currentSeq++;
      }
    });

    this.saveEditModel();
  }

  onDragSuccess($event: Event) {
    this.arrangeItemSequence();
  }

  /** 將目前編輯的內容儲存回Input */
  saveEditModel() {
    this.titleBarInformations.Informations = Object.assign(
      [], this.editDataModel.filter(x => x.Seq !== ''));
    console.debug(this.titleBarInformations.Informations);
  }
}

interface IVideoTitleBar {
  Informations: TitleBarInformationItem[];
  FontFamily: string;
  FontSize: string;
  FontColor: string;
  BackgroundColor: string;
}

interface TitleBarInformationItem {
  Seq: string;
  Type: string;
}
