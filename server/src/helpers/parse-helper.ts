import * as Parse from 'parse/node';
import { Subject } from 'rxjs/Rx';
import { ConfigHelper } from './config-helper';
import {} from '../domain';

export class ParseHelper {

    host: string;

    port: number;

    isHttps = false;

    get httpType() {
        return this.isHttps ? 'https' : 'http';
    }

    get serverUrl() {
        return `${this.httpType}://${this.host}:${this.port}`;
    }

    get parseServerUrl() {
        return `${this.httpType}://${this.host}:${this.port}${this.pathConfig.PARSE_PATH}`;
    }

    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: ParseHelper;

    private parseConfig = ConfigHelper.instance.parseConfig;

    private pathConfig = ConfigHelper.instance.pathConfig;

    constructor() {
        this.initParse();
    }

    initParse() {
        this.host = this.parseConfig.HOST || 'localhost';
        this.port = this.parseConfig.PORT || 3000;
        this.isHttps = this.parseConfig.IS_HTTPS || false;

        Parse.initialize(
            this.parseConfig.APPLICATION_ID || 'APPLICATION_ID',
            this.parseConfig.JAVASCRIPT_KEY || 'JAVASCRIPT_KEY'
        );

        Parse[`${'masterKey'}`] = this.parseConfig.MASTER_KEY || 'MASTER_KEY';
        Parse[`${'serverURL'}`] = this.parseServerUrl;

        
    }


    createLiveQueryWatcher<T extends Parse.Object>(args: {
        type: new (options?: any) => T,
        action: LiveQueryEventType,
        filter?: (query: Parse.Query<T>) => void
    }): Subject<ILiveQueryData> {
        const subject: Subject<ILiveQueryData> = new Subject();
        const query = new Parse.Query(args.type);
        if (args.filter) {
            args.filter(query);
        }

        const sub$ = (query as any).subscribe();
        Object.values(LiveQueryEventType)
            .filter(key => typeof (key) === 'string')
            .forEach(key => {
                if (!(args.action & (LiveQueryEventType[key] as any))) {
                    return;
                }
                const action = key.toLocaleLowerCase();
                sub$.on(action, event => subject.next({
                    action: action,
                    data: event
                }));
            });

        return subject;
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
        return query.find();
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

