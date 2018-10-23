import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-resolution-region',
  templateUrl: './resolution-region.component.html',
  styleUrls: ['./resolution-region.component.css']
})
export class ResolutionRegionComponent implements OnInit, OnChanges {
  @Input() maxResolution: string;
  @Input() currentResolution: string;
  /** 換算後實際解析度位置 */
  @Input() realResolutionPosition: IPositionCoordinate;
  @Output() currentRegionCoordinateEvent: EventEmitter<any> = new EventEmitter();
  @ViewChild('basicContainer') basicContainer: ElementRef;
  @ViewChild('currentRegion') currentRegion: ElementRef;
  maxResolutionValue: IResolutionValue;
  currentResolutionValue: IResolutionValue;
  onDragMode: boolean;
  /** 畫面上開始拖拉起始點 */
  beginDragPosition: IPositionCoordinate;
  /** 畫面上CurrentRegion顯示位置 */
  currentRegionPosition: IPositionCoordinate;
  /** 解析度寬度與畫面的比率 */
  get getWidthRatio() {
    return this.maxResolutionValue.Width / this.basicContainer.nativeElement.offsetWidth;
  }
  /** 解析度高度與畫面的比率 */
  get getHeightRatio() {
    return this.maxResolutionValue.Height / this.basicContainer.nativeElement.offsetHeight;
  }
  /** 畫面上CurrentRegion最大X位置 */
  get getMaxRegionX() {
    return Math.floor((this.maxResolutionValue.Width - this.currentResolutionValue.Width)
      / this.getWidthRatio);
  }
  /** 畫面上CurrentRegion最大Y位置 */
  get getMaxRegionY() {
    return Math.floor((this.maxResolutionValue.Height - this.currentResolutionValue.Height)
      / this.getHeightRatio);
  }

  constructor() { }

  ngOnInit() {
    const $window = $(window);
    $window.resize(event => this.resizeAndReposition());
    $window.mousemove(event => this.dragMove(event));
    $window.mouseup(event => this.setEndDragPosition(event));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.maxResolution) {
      this.maxResolution = changes.maxResolution.currentValue;
      this.maxResolutionValue = this.stringToResolution(this.maxResolution);
    }
    if (changes.realResolutionPosition) {
      this.realResolutionPosition = changes.realResolutionPosition.currentValue;
    }
    if (changes.currentResolution) {
      this.currentResolution = changes.currentResolution.currentValue;
      this.currentResolutionValue = this.stringToResolution(this.currentResolution);
      this.resizeAndReposition();
      this.adjustRegionPosition();
      this.submitRealPosition();
    }
  }

  /** 調整視窗時同步調整CurrentRegion寬高與位置 */
  resizeAndReposition() {
    $(this.currentRegion.nativeElement).css('width', this.currentResolutionValue.Width / this.getWidthRatio + 'px');
    $(this.currentRegion.nativeElement).css('height', this.currentResolutionValue.Height / this.getHeightRatio + 'px');

    this.realToDisplay();
    $(this.currentRegion.nativeElement).css('left', this.currentRegionPosition.X + 'px');
    $(this.currentRegion.nativeElement).css('top', this.currentRegionPosition.Y + 'px');
  }

  /** Resolution字串轉為IResolutionValue物件 */
  stringToResolution(resolutionString: string): IResolutionValue {
    if (!resolutionString) {
      return undefined;
    }
    const seq = resolutionString.split('x');
    return {
      Width: Number(seq[0]),
      Height: Number(seq[1])
    };
  }

  /** CurrentRegion MouseDown事件, 由layout觸發 */
  setBeginDragPosition(event: JQuery.Event) {
    this.onDragMode = true;
    this.beginDragPosition = { X: event.clientX, Y: event.clientY };
  }

  /** CurrentRegion MouseUp事件 */
  setEndDragPosition(event: JQuery.Event) {
    if (!this.onDragMode) {
      return;
    }
    this.onDragMode = false;
    this.submitRealPosition();
  }

  /** CurrentRegion MouseMove事件 */
  dragMove(event: JQuery.Event) {
    if (!this.onDragMode) {
      return;
    }

    // CurrentRegion起點XY加上偏移量
    this.currentRegionPosition.X += (event.clientX - this.beginDragPosition.X);
    this.currentRegionPosition.Y += (event.clientY - this.beginDragPosition.Y);
    this.adjustRegionPosition();

    this.beginDragPosition = { X: event.clientX, Y: event.clientY };
  }

  /** 調整CurrentRegion位置使其不超過範圍 */
  adjustRegionPosition() {
    if (this.currentRegionPosition.X < 0) {
      this.currentRegionPosition.X = 0;
    }
    if (this.currentRegionPosition.X > this.getMaxRegionX) {
      this.currentRegionPosition.X = this.getMaxRegionX;
    }

    if (this.currentRegionPosition.Y < 0) {
      this.currentRegionPosition.Y = 0;
    }
    if (this.currentRegionPosition.Y > this.getMaxRegionY) {
      this.currentRegionPosition.Y = this.getMaxRegionY;
    }

    $(this.currentRegion.nativeElement).css('left', this.currentRegionPosition.X + 'px');
    $(this.currentRegion.nativeElement).css('top', this.currentRegionPosition.Y + 'px');
  }

  /** 根據目前畫面上的CurrentRegion顯示位置，計算實際解析度XY並回傳 */
  submitRealPosition() {
    this.displayToReal();
    this.currentRegionCoordinateEvent.emit(this.realResolutionPosition);
  }

  /** 依照畫面顯示位置，計算實際解析度XY */
  displayToReal() {
    this.realResolutionPosition = {
      X: Math.ceil(this.currentRegionPosition.X * this.getWidthRatio),
      Y: Math.ceil(this.currentRegionPosition.Y * this.getHeightRatio)
    };
  }
  /** 依照實際解析度位置，計算畫面上應顯示位置 */
  realToDisplay() {
    this.currentRegionPosition = {
      X: this.realResolutionPosition.X / this.getWidthRatio,
      Y: this.realResolutionPosition.Y / this.getHeightRatio
    };
  }
}

interface IResolutionValue {
  Width: number;
  Height: number;
}

interface IPositionCoordinate {
  X: number;
  Y: number;
}
