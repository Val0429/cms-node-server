import * as fs from 'fs';
import * as util from 'util';
import { ConfigHelper, LogHelper } from '../helpers';

export class HouseKeeperService {
    config = ConfigHelper.instance;
    mongoist =require('mongoist');
    logHelper = LogHelper.instance;
    cycleInterval: number;

    static get instance() {
        return this._instance || (this._instance = new this());
    }
    private db:any;
    private static _instance: HouseKeeperService;

    constructor() {     
        this.db = this.mongoist(`${this.config.parseConfig.DATABASE_URI}`); 
        this.keepDays = this.config.externalConfig.houseKeeper.keepDays || 90;
        this.cycleInterval = this.config.externalConfig.houseKeeper.cycleInterval || 60*60*1000;        
        //run check every hour
        setInterval(async ()=>{
            await this.startTask();
        }, this.cycleInterval);
        //this.startTask();
    }
    className="HouseKeeper";
    keepDays :number;
    writeLog(d:any){
        this.logHelper.writeLog({ type: this.className, msg: util.format(d)});       
    }

    async startTask() {
        try{
            let locking = await this.db.collection(this.className).find({});            
            if(locking&&locking.length>0)return;
            let baseline = new Date();            
            baseline.setDate(baseline.getDate() - this.keepDays);      
            let message = "Delete Event and SystemLog older than " + baseline.toISOString();
            this.writeLog(message);
            await this.db.collection(this.className).insert({"deleting":message});
            const delEvents$ =  this.db.collection('Event').remove({ _created_at: { $lt: baseline } }).then(res=>this.writeLog("Deleted Event count: " + res.deletedCount));
            const delSystemLogs$ = this.db.collection('SystemLog').remove({ _created_at: { $lt: baseline } }).then(res=>this.writeLog("Deleted SystemLog count: " + res.deletedCount));
            await Promise.all([delEvents$, delSystemLogs$]);
            await this.db.collection(this.className).drop((err, success)=>{
                this.writeLog(err.toString());
            });
        }catch(err){
            this.writeLog(err.toString());
        }
    }
        

}