import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CSVService } from 'app/service/csv.service';
import { SysLog } from 'app/model/core';
import { IPageViewerOptions } from 'app/shared/components/page-viewer/page-viewer.component';
import { Observable } from 'rxjs/Observable';
import * as moment from 'moment';

@Component({
  selector: 'app-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.css']
})
export class LogComponent implements OnInit {
  dataList: SysLog[];
  pageViewerOptions: IPageViewerOptions;
  queryParams: {
    page?: number,
    count?: number,
    keyword?: string,
    startDate?: string,
    endDate?: string
  } = {};
  flag = {
    search: false
  };
  dateType = '';

  constructor(
    private router: Router,
    private coreService: CoreService,
    private parseService: ParseService,
    private csvService: CSVService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit() {
    this.initUIData();
    this.fetchRouteQueryParams()
      .switchMap(() => this.fetchDataList())
      .subscribe();
  }

  initUIData() {
    this.queryParams.startDate = moment(new Date()).format('YYYY-MM-DD');
    this.queryParams.endDate = moment(new Date()).format('YYYY-MM-DD');
  }

  /** 取得路由參數 */
  fetchRouteQueryParams() {
    const queryParams$ = this.activatedRoute.queryParams
      .do(queryParams => {
        Object.assign(this.queryParams, queryParams);
        // number類型條件另外處理
        ['page']
          .forEach(key => this.queryParams[key] = +this.queryParams[key] || 0);
      });
    return queryParams$;
  }

  /** 取得DataList */
  fetchDataList() {
    this.dataList = undefined;

    // 分頁器選項
    const options: IPageViewerOptions = {
      currentPage: this.queryParams.page || 1,
      pageVisibleSize: 10,
      itemVisibleSize: this.queryParams.count || 20,
      itemCount: 0
    };

    // 查詢條件
    const filter = (query: Parse.Query<SysLog>) => {
      if (this.queryParams.keyword) {
        const keywordQueries = ['ServerName', 'Type', 'Description'].map(column =>
          new Parse.Query(SysLog)
            .contains(column, this.queryParams.keyword));
        Object.assign(query, Parse.Query.or(...keywordQueries));
        // Object.assign之後重新設定分頁
        query.limit(options.itemVisibleSize);
        query.skip((options.currentPage - 1) * options.itemVisibleSize);
      }
      if (this.queryParams.startDate) {
        const date = moment(this.queryParams.startDate).format('x');
        query.greaterThanOrEqualTo('Time', Number(date));
      }
      if (this.queryParams.endDate) {
        const date = moment(this.queryParams.endDate).add(1, 'd').subtract(1, 's').format('x');
        query.lessThanOrEqualTo('Time', Number(date));
      }
      query.descending('createAt');
    };

    // 取得分頁資料
    const fetch$ = Observable.fromPromise(this.parseService.fetchPagingAndCount({
      type: SysLog,
      currentPage: options.currentPage,
      itemVisibleSize: options.itemVisibleSize,
      filter: filter
    })).do(result => {
      options.itemCount = result.count;
      this.pageViewerOptions = options;
      this.dataList = result.data;
    });

    return fetch$;
  }

  /** 頁碼變更 */
  pageChange(pageNumber?: number) {
    const queryParams = Object.assign({}, this.queryParams);
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
        delete queryParams[key];
      }
    });

    queryParams.page = pageNumber || 1;
    this.router.navigate(['/log'], { queryParams: queryParams });
  }

  datePeriodChange(value: string) {
    if (!this.dateType) {
      return;
    }
    if (this.dateType === 'Begin') {
      this.queryParams.startDate = value;
    }
    if (this.dateType === 'End') {
      this.queryParams.endDate = value;
    }
  }

  /** 取得timestamp所定時間, 使用在顯示list與匯出csv */
  getDate(timestamp: number) {
    return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
  }

  /** 將目前Filter符合的Log資料匯出為CSV */
  exportCSV() {
    let tempLogs: SysLog[];

    // 查詢條件
    const filter = (query: Parse.Query<SysLog>) => {
      if (this.queryParams.keyword) {
        const keywordQueries = ['ServerName', 'Type', 'Description'].map(column =>
          new Parse.Query(SysLog)
            .contains(column, this.queryParams.keyword));
        Object.assign(query, Parse.Query.or(...keywordQueries));
      }
      if (this.queryParams.startDate) {
        const date = moment(this.queryParams.startDate).format('x');
        query.greaterThanOrEqualTo('Time', Number(date));
      }
      if (this.queryParams.endDate) {
        const date = moment(this.queryParams.endDate).add(1, 'd').subtract(1, 's').format('x');
        query.lessThanOrEqualTo('Time', Number(date));
      }
      query.descending('createAt');
      query.limit(30000);
    };

    // 取得所有Log資料
    const fetch$ = Observable.fromPromise(this.parseService.fetchData({
      type: SysLog,
      filter: filter
    }))
      .map(logs => tempLogs = logs);

    fetch$
      .do(logs => {
        const rows = tempLogs
          .map(log => `${this.getDate(log.Time)},${log.Type},${log.ServerName},${log.Description}`);
        this.csvService.downloadCSV({
          header: 'Time,Type,Server Name,Description',
          data: rows,
          fileName: 'Log_Export',
          timestamp: 'YYYY-MM-DD HHmmss'
        });
      }).subscribe();
  }
}
