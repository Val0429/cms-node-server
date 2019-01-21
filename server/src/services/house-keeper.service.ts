import * as fs from 'fs';
import * as util from 'util';
import { ConfigHelper, LogHelper } from '../helpers';

export class HouseKeeperService {
    config = ConfigHelper.instance;
    mongoist =require('mongoist');
    logHelper = LogHelper.instance;

    static get instance() {
        return this._instance || (this._instance = new this());
    }
    private db:any;
    private static _instance: HouseKeeperService;

    constructor() {     
        this.db = this.mongoist(`${this.config.parseConfig.DATABASE_URI}`); 
        this.days = this.config.externalConfig.houseKeeper.keepDays || 90;        
        //run check every hour
        setInterval(async ()=>{
            await this.startTask();
        }, 60 * 60 * 1000);
        //this.startTask();
    }
    
    days :number;
    writeLog(d:any){
        this.logHelper.writeLog({ type: 'HouseKeeper', msg: new Date().toLocaleString('en-US', { hour12: false }) + ' ' + util.format(d) + '\n' });       
    }

    async startTask() {
        try{
            let baseline = new Date();            
            baseline.setDate(baseline.getDate() - this.days);      
            this.writeLog("Delete Event and SystemLog older than " + baseline.toISOString());
            const delEvents$ =  this.db.collection('Event').remove({ _created_at: { $lt: baseline } }).then(res=>this.writeLog("Deleted Event count: " + res.deletedCount));
            const delSystemLogs$ = this.db.collection('SystemLog').remove({ _created_at: { $lt: baseline } }).then(res=>this.writeLog("Deleted SystemLog count: " + res.deletedCount));
            await Promise.all([delEvents$, delSystemLogs$]);
        }catch(err){
            this.writeLog(err.toString());
        }
    }
        

}