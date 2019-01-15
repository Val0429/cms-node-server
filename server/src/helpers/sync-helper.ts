import { DBSync, Event, SysLog } from '../domain/core';
import { ParseHelper, LogHelper, ConfigHelper } from '.';
import * as moment from 'moment';
import { Observable } from 'rxjs/Observable';
import * as fetch from 'node-fetch';

export class SyncHelper {
    private static _instance: SyncHelper;

    public static get instance() {
        return this._instance || (this._instance = new this());
    }

    parseHelper = ParseHelper.instance;
    logHelper = LogHelper.instance;
    configHelper = ConfigHelper.instance;
    /** CMS ParseServer Header */
    parseHeaders = {
        'X-Parse-Application-Id': 'CMS3-Parse-API',
        'Content-Type': 'application/json'
    };


    constructor() {
        
        this.setAutoSyncDefault();
        this.syncTimeout();
        console.log(`Addr: ${this.configHelper.parseConfig.HOST}`);
        
    }

    /** 每次重啟server後都將DBSync的autoSync設為false, 避免Server復活後主動備份資料 */
    setAutoSyncDefault() {
        
        setTimeout(async ()=>{
            try{
                await this.parseHelper.getData({ type: DBSync })
                    .then(result => {
                        const data = result ? result : new DBSync();
                        data.autoSync = false;
                        if (!data.destination) {
                            data.destination = [];
                        }
                        data.save();
                    })
                }catch(err){
                    //console.log(err);
                    console.log("unable to connect to parse server")
                }
        },5000);
        
            
    }

    /** 計數器, 一開始先等待一輪時間避免剛啟動就同步
     * 每10分鐘小時同步一次一般資料表, 每1小時同步一次所有資料表
    */
    syncTimeout() {
        const period = this.configHelper.parseConfig.DB_BACKUP_PERIOD * 1000;
        Observable.timer(period, period)
            .do(num => this.runAutoSync((num % 6) === 0)).subscribe();
        // 下面是執行同步前先檢查資料表上限的版本
        // Observable.timer(period, period)
        //     .do(num => {
        //         this.refreshDatabase()
        //             .do(() => this.runAutoSync((num % 6) === 0));
        //     }).subscribe();
    }

    /** 執行同步, 個別呼叫其他Server的api並紀錄log */
    runAutoSync(allCollection: boolean) {
        const excludeCollection = ['DBSync']; // 排除清單, DBSync固定不可同步
        if (!allCollection) {
            // 此2個Collection資料量龐大, 經常納入排除清單
            excludeCollection.push('Event');
            excludeCollection.push('SysLog');
        }

        const logType = 'DB Backup';
        Observable.fromPromise(this.parseHelper.getData({ type: DBSync }))
            .map(dbSync => {
                if (dbSync.autoSync && dbSync.destination.length > 0) {
                    this.logHelper.writeLog({ type: logType, msg: 'Start to backup database.' });
                    const requestInit = {
                        method: 'POST',
                        headers: this.parseHeaders,
                        body: JSON.stringify({
                            sourceUrl: `${this.configHelper.parseConfig.HOST}:27017`,
                            exclude: excludeCollection
                        })
                    };
                    dbSync.destination.forEach(connectInfo => {
                        const destination = `${connectInfo.ip}:${connectInfo.port}`;
                        this.logHelper.writeLog({ type: logType, msg: `Connect to ${destination}` });
                        fetch(`http://${connectInfo.ip}:${connectInfo.port}/parse/cms/syncDB`, requestInit)
                            .then(data => data.json())
                            .then(data => this.logHelper.writeLog({ type: logType, msg: `Message from ${destination} - ${data}` }))
                            .catch(err => this.logHelper.writeLog({ type: logType, msg: `Message from ${destination} - ${err}` }));
                    });
                }
            })
            .toPromise()
            .catch(err => this.logHelper.writeLog({ type: logType, msg: err }));
    }

    /** 依序指定collection呼叫檢查 */
    refreshDatabase() {
        return this.refreshCollection(Event)
            .switchMap(() => this.refreshCollection(SysLog));
    }

    /** 檢查單一collection是否超出資料上限並刪除多餘的舊資料 */
    refreshCollection<T extends Parse.Object>(type: new (options?: any) => T) {
        const count$ = Observable.fromPromise(this.parseHelper.countFetch({ type: type }));
        const fetchAndDestroy$ = (count: number) => Observable.fromPromise(this.parseHelper.fetchData({
            type: type,
            filter: query => query
                .select('updatedAt')
                .ascending('updatedAt')
                .limit(count - 500000)
        })).switchMap(data => Parse.Object.destroyAll(data));

        return count$
            .switchMap(count => {
                if (count <= 500000) {
                    return Observable.of(null);
                }
                return fetchAndDestroy$(count);
            });
    }
}

