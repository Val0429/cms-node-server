import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Component({
  selector: 'app-page-viewer',
  templateUrl: './page-viewer.component.html',
  styleUrls: ['./page-viewer.component.css']
})
export class PageViewerComponent implements OnChanges, OnInit {

  private _pageViewerOptions = new BehaviorSubject<IPageViewerOptions>(null);

  @Input() set pageViewerOptions(value) {
    this._pageViewerOptions.next(value);
  }

  get pageViewerOptions() {
    return this._pageViewerOptions.getValue();
  }

  @Input() debug = false;

  @Output() pageChange = new EventEmitter<number>();

  infos: IPageViewerInfo = {};

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    this.initPageInfo();
  }

  ngOnInit() {
  }

  /** 初始化分頁資訊 */
  initPageInfo() {

    if (!this.pageViewerOptions) {
      return;
    }

    // 計算總頁數
    this.infos.pageCount = Math.ceil(this.pageViewerOptions.itemCount / this.pageViewerOptions.itemVisibleSize);

    // 更新第一頁頁碼
    this.infos.firstPage = 1;

    // 更新最末頁頁碼
    this.infos.lastPage = this.infos.pageCount;

    // 驗證最末頁頁碼是否小於第一頁頁碼
    if (this.infos.lastPage < this.infos.firstPage) {
      this.infos.lastPage = this.infos.firstPage;
    }

    // 驗證頁碼是否小於第一頁頁碼
    if (this.pageViewerOptions.currentPage < this.infos.firstPage) {
      this.pageViewerOptions.currentPage = 1;
    }

    // 驗證頁碼是否大於第末頁頁碼
    if (this.pageViewerOptions.currentPage > this.infos.lastPage) {
      this.pageViewerOptions.currentPage = this.infos.lastPage;
    }

    // 更新上一頁頁碼
    this.infos.previousPage = this.pageViewerOptions.currentPage - 1 || 1;

    // 更新下一頁頁碼
    this.infos.nextPage = this.pageViewerOptions.currentPage + 1;

    // 驗證頁碼是否大於第末頁頁碼
    if (this.infos.nextPage > this.infos.lastPage) {
      this.infos.nextPage = this.infos.lastPage;
    }

    // 更新當前筆數範圍(開始)
    this.infos.itemVisibleFrom = ((this.pageViewerOptions.currentPage - 1) * this.pageViewerOptions.itemVisibleSize) + 1;

    // 更新當前筆數範圍(結束)
    this.infos.itemVisibleTo = this.infos.itemVisibleFrom + this.pageViewerOptions.itemVisibleSize - 1;

    // 檢查 當前筆數範圍(結束) 筆數 是否大於 總筆數
    if (this.infos.itemVisibleTo > this.pageViewerOptions.itemCount) {
      this.infos.itemVisibleTo = this.pageViewerOptions.itemCount;
    }

    // 一次顯示的分頁數量的一半
    const halfPageVisibleSize = Math.floor(this.pageViewerOptions.pageVisibleSize / 2);

    // 當前頁數範圍(開始)
    const beginPage = this.pageViewerOptions.currentPage - halfPageVisibleSize + 1;
    this.infos.pageVisibleFrom = beginPage >= 1 ? beginPage : 1;

    // 校正當前頁數範圍(結束)
    if ((this.infos.lastPage - this.pageViewerOptions.currentPage) <= halfPageVisibleSize) {
      this.infos.pageVisibleFrom = this.infos.lastPage - this.pageViewerOptions.pageVisibleSize + 1;
    }

    if (this.infos.pageVisibleFrom < 1) {
      this.infos.pageVisibleFrom = 1;
    }

    // 當前頁數範圍(結束)
    const endPage = this.pageViewerOptions.currentPage + halfPageVisibleSize;
    this.infos.pageVisibleTo = endPage >= this.infos.lastPage ? this.infos.lastPage : endPage;

    // 校正當前頁數範圍(開始)
    if (this.pageViewerOptions.currentPage <= halfPageVisibleSize) {
      this.infos.pageVisibleTo = this.pageViewerOptions.pageVisibleSize;
    }

    if (this.infos.pageVisibleTo > this.infos.lastPage) {
      this.infos.pageVisibleTo = this.infos.lastPage;
    }

    // 更新是否有上一頁
    this.infos.hasPreviousPage = this.infos.pageVisibleFrom > 1;

    // 更新是否有下一頁
    this.infos.hasNextPage = this.infos.pageVisibleTo < this.infos.lastPage;
  }

  fakePageDataSet() {
    const pages: number[] = [];
    for (let i = this.infos.pageVisibleFrom; i <= this.infos.pageVisibleTo; i++) {
      pages.push(i);
    }
    return pages;
  }

  notifyPageChange(pageNumber: number) {
    if (this.pageViewerOptions.currentPage === pageNumber) {
      return;
    }

    this.pageViewerOptions.currentPage = pageNumber || 1;
    this.initPageInfo();

    this.pageChange.emit(this.pageViewerOptions.currentPage);
  }
}

export interface IPageViewerOptions {

  /** 當前頁碼 */
  currentPage: number;

  /** 一次顯示的分頁數量 */
  pageVisibleSize: number;

  /** 每頁顯示筆數 */
  itemVisibleSize: number;

  /** 總筆數 */
  itemCount: number;

  /** 第一頁按鈕文字 */
  firstPageText?: string;

  /** 上一頁按鈕文字 */
  previousPageText?: string;

  /** 下一頁按鈕文字 */
  nextPageText?: string;

  /** 最末頁按鈕文字 */
  lastPageText?: string;
}

export interface IPageViewerInfo {
  /** 總頁數 */
  pageCount?: number;

  /** 第一頁頁碼 */
  firstPage?: number;

  /** 上一頁頁碼 */
  previousPage?: number;

  /** 下一頁頁碼 */
  nextPage?: number;

  /** 最末頁頁碼 */
  lastPage?: number;

  /** 當前筆數範圍(開始) */
  itemVisibleFrom?: number;

  /** 當前筆數範圍(結束) */
  itemVisibleTo?: number;

  /** 當前頁數範圍(開始) */
  pageVisibleFrom?: number;

  /** 當前頁數範圍(結束) */
  pageVisibleTo?: number;

  /** 是否有上一頁 */
  hasPreviousPage?: boolean;

  /** 是否有下一頁 */
  hasNextPage?: boolean;
}

