import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { environment } from 'environments/environment';
import { Subject } from 'rxjs/Rx';
import {
  UserGroup, Group, Nvr, ServerInfo, Server,
  RecordScheduleTemplate, RecordSchedule, Event, EventScheduleTemplate,
  EventHandler, EventRecovery, Device, General, SysLog, DBSync
} from 'app/model/core';

@Injectable()
export class ParseService {

  host = 'localhost';

  port = 3000;

  isHttps = false;

  get httpType() {
    return this.isHttps ? 'https' : 'http';
  }

  get serverUrl() {
    return `${this.httpType}://${this.host}:${this.port}`;
  }

  get parseServerUrl() {
    return `${this.httpType}://${this.host}:${this.port}/parse`;
  }

  constructor(private http: Http) {
    this.initParseServer().subscribe();
  }

  /** 初始化 Parse Server */
  initParseServer() {
    const init$ = this.http.get(`${environment.apiBasePath}/config/parse.config.json?v=${Date.now()}`)
      .map(res => res.json())
      .map(config => {
        if (!config || Object.keys(config).length < 1) {
          return;
        }
        this.isHttps = config.IS_HTTPS || false;
        this.host = config.HOST || 'localhost';
        this.port = config.PORT || 3000;

        Parse.initialize(config.APPLICATION_ID, config.JAVASCRIPT_KEY);
        Parse.masterKey = config.MASTER_KEY;
        Parse.serverURL = this.parseServerUrl;
        this.registerSubclass();
      });
    return init$;
  }

  registerSubclass() {
    Parse.Object.registerSubclass('UserGroup', UserGroup);
    Parse.Object.registerSubclass('Group', Group);
    Parse.Object.registerSubclass('Nvr', Nvr);
    Parse.Object.registerSubclass('ServerInfo', ServerInfo);
    Parse.Object.registerSubclass('Server', Server);
    Parse.Object.registerSubclass('RecordScheduleTemplate', RecordScheduleTemplate);
    Parse.Object.registerSubclass('RecordSchedule', RecordSchedule);
    Parse.Object.registerSubclass('Event', Event);
    Parse.Object.registerSubclass('EventScheduleTemplate', EventScheduleTemplate);
    Parse.Object.registerSubclass('EventHandler', EventHandler);
    Parse.Object.registerSubclass('EventRecovery', EventRecovery);
    Parse.Object.registerSubclass('Device', Device);
    Parse.Object.registerSubclass('General', General);
    Parse.Object.registerSubclass('SysLog', SysLog);
    Parse.Object.registerSubclass('DBSync', DBSync);
  }

  // createLiveQueryWatcher<T extends Parse.Object>(args: {
  //   type: new (options?: any) => T,
  //   action: LiveQueryEventType,
  //   filter?: (query: Parse.Query<T>) => void
  // }): Subject<ILiveQueryData> {
  //   const subject: Subject<ILiveQueryData> = new Subject();
  //   const query = new Parse.Query(args.type);
  //   if (args.filter) {
  //     args.filter(query);
  //   }

  //   const sub$ = (query as any).subscribe();
  //   Object.values(LiveQueryEventType)
  //     .filter(key => typeof (key) === 'string')
  //     .forEach(key => {
  //       if (!(args.action & (LiveQueryEventType[key] as any))) {
  //         return;
  //       }
  //       const action = key.toLocaleLowerCase();
  //       sub$.on(action, event => subject.next({
  //         action: action,
  //         data: event
  //       }));
  //     });

  //   return subject;
  // }

  getQuerySubscription<T extends Parse.Object>(args: {
    type: new (options?: any) => T,
    filter?: (query: Parse.Query<T>) => void
  }): Parse.Promise<T[]> {
    const query = new Parse.Query(args.type);
    if (args.filter) {
      args.filter(query);
    }
    return (query as any).subscribe();
  }

  getData<T extends Parse.Object>(args: {
    type: new (options?: any) => T,
    filter?: (query: Parse.Query<T>) => void
  }): Parse.Promise<T> {
    const query = new Parse.Query(args.type);
    if (args.filter) {
      args.filter(query);
    }
    return query.first();
  }

  getDataById<T extends Parse.Object>(args: {
    type: new (options?: any) => T,
    objectId: string,
    option?: Parse.Query.GetOptions
  }): Parse.Promise<T> {
    const query = new Parse.Query(args.type);
    return query.get(args.objectId, args.option);
  }

  fetchData<T extends Parse.Object>(args: {
    type: new (options?: any) => T,
    filter?: (query: Parse.Query<T>) => void
  }): Parse.Promise<T[]> {
    const query = new Parse.Query(args.type);
    if (args.filter) {
      args.filter(query);
    }
    return query.find({ useMasterKey: true });
  }

  fetchPaging<T extends Parse.Object>(args: {
    type: new (options?: any) => T,
    currentPage: number,
    itemVisibleSize: number,
    filter?: (query: Parse.Query<T>) => void
  }): Parse.Promise<T[]> {
    const locations = this.fetchData<T>({
      type: args.type,
      filter: query => {
        query.limit(args.itemVisibleSize);
        query.skip((args.currentPage - 1) * args.itemVisibleSize);
        if (args && args.filter) {
          args.filter(query);
        }
      }
    });
    return locations;
  }

  countFetch<T extends Parse.Object>(args: {
    type: new (options?: any) => T,
    filter?: (query: Parse.Query<T>) => void
  }): Parse.Promise<number> {
    const query = new Parse.Query(args.type);
    if (args.filter) {
      args.filter(query);
    }
    return query.count();
  }

  fetchPagingAndCount<T extends Parse.Object>(args: {
    type: new (options?: any) => T,
    currentPage: number,
    itemVisibleSize: number,
    filter?: (query: Parse.Query<T>) => void
  }) {
    const result: { data?: T[], count?: number } = {};

    // 取得筆數
    const count$ = this.countFetch({
      type: args.type,
      filter: args.filter
    }).then(count => result.count = count);

    // 取得分頁資料
    const fetch$ = this.fetchPaging(args)
      .then(data => result.data = data);

    // 合併執行
    return count$
      .then(() => fetch$)
      .then(() => result);
  }

  deleteCollection<T extends Parse.Object>(args: {
    type: new (options?: any) => T
  }) {
    return this.fetchData({ type: args.type })
      .then(data => Parse.Object.destroyAll(data, {

      }));
  }
}

export interface ILiveQueryData {
  action: string;
  data: Parse.Object;
}

export enum LiveQueryEventType {
  CREATE = 1,
  ENTER = 2,
  UPDATE = 4,
  LEAVE = 8,
  DELETE = 16
}
