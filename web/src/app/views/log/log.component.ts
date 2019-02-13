import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { CSVService } from 'app/service/csv.service';
import { SystemLog } from 'app/model/core';
import { IPageViewerOptions } from 'app/shared/components/page-viewer/page-viewer.component';
import { Observable } from 'rxjs/Observable';
import * as moment from 'moment';
import { RestFulService, GetResult } from 'app/service/restful.service';

@Component({
  selector: 'app-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.css']
})
export class LogComponent implements OnInit {
  dataList: SystemLog[];
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
    private restFulService:RestFulService,
    private coreService: CoreService,
    private parseService: ParseService,
    private csvService: CSVService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit() {
    this.initUIData();
    this.fetchRouteQueryParams()
      .switchMap(async () => this.fetchDataList())
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
  async fetchDataList() {
    this.dataList = undefined;

    // 分頁器選項
    const options: IPageViewerOptions = {
      currentPage: this.queryParams.page || 1,
      pageVisibleSize: 10,
      itemVisibleSize: 50,
      itemCount: 0
    };
    console.debug("paging", options);
    
    await this.getData((options.currentPage - 1) * options.itemVisibleSize, options.itemVisibleSize).then(result=>{
      options.itemCount = result.count;
      this.pageViewerOptions = options;
      this.dataList = result.results;
    });
    
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
  getDate(timestamp: any) {    
      return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');    
  }

  /** 將目前Filter符合的Log資料匯出為CSV */
  async exportCSV() {
    let total = this.pageViewerOptions.itemCount;
    let limit=10000;
    let skip=0;
    let results:GetResult[]= [];
    let promises = [];
    if(total>limit){
      let page=1;
      while(skip<total){        
        const get$ = this.getData(skip,limit).then(result =>{
          results = results.concat(result);
        });        
        promises.push(get$);
        page++;   
        skip = (page-1)*limit;     
      }
      await Promise.all(promises);
      results.sort((a, b) => a.page> b.page ? 1 : b.page > a.page ? -1 : 0);
    }else{
      let result = await this.getData(skip,limit);
      results.push(result);
    }
    // 取得所有Log資料
    let rows = [];
    for(let item of results){
      rows = rows.concat(item.results);
    }
    this.csvService.downloadCSV({
      header: 'Time,Level,Identity,Category,Message',
      data: rows.map(log => `${this.getDate(log.Timestamp)},${log.Level},${log.Identity},${log.Category},${log.Message}`),
      fileName: 'Log_Export',
      timestamp: 'YYYY-MM-DD HHmmss'
    });
  }
  async getData(skip:number, limit:number){
   return await this.restFulService.get({
      type: SystemLog,
      filter: query => {
        if (this.queryParams.keyword) {
          const keywordQueries = ['Level', 'Category', 'Identity','Message'].map(column =>
            new Parse.Query(SystemLog)
              .contains(column, this.queryParams.keyword));
          Object.assign(query, Parse.Query.or(...keywordQueries));
        }
        if (this.queryParams.startDate) {
          const date = moment(this.queryParams.startDate).format('x');
          query.greaterThanOrEqualTo('Timestamp', Number(date));
        }
        if (this.queryParams.endDate) {
          const date = moment(this.queryParams.endDate).add(1, 'd').subtract(1, 's').format('x');
          query.lessThanOrEqualTo('Timestamp', Number(date));
        }
        //query.descending('createdAt');      
        query.skip(skip);
        query.limit(limit);
        return query;
      }
    });
  }
}
