import * as util from 'util';
import { ConfigHelper, LogHelper } from '../helpers';
import { RestFulService } from './restful.service';

export class HouseKeeperService {
    config = ConfigHelper.instance;
    restFulService = RestFulService.instance;
    logHelper = LogHelper.instance;
    cycleInterval: number;

    static get instance() {
        return this._instance || (this._instance = new this());
    }
    
    private static _instance: HouseKeeperService;

    constructor() {     
    
        this.keepDays = this.config.externalConfig.houseKeeper.keepDays || 90;
        this.cycleInterval = this.config.externalConfig.houseKeeper.cycleInterval || 60*60*1000;        
        
        //run check every hour
        setInterval(async ()=>{
            await this.startTask();
        }, this.cycleInterval);
        //this.startTask();
    }
    className="HouseKeeperLog";
    keepDays :number;
    writeLog(d:any){
        this.logHelper.writeLog({ type: this.className, msg: util.format(d)});       
    }
    
    async startTask() {
        try{
            let baseline = new Date();
            //only 1 process allowed per cycle         
            let lastCycle = new Date();
            lastCycle.setTime(lastCycle.getTime()-this.cycleInterval+100);
            
            let locking = await this.restFulService.getDataCount(this.className, { _created_at: { $gt: lastCycle }});
            if(locking>0)return;                        
            baseline.setDate(baseline.getDate() - this.keepDays);      
            let message = "Delete Event and SystemLog older than " + baseline.toISOString();
            this.writeLog(message);
            await this.restFulService.insertMany(this.className,[{timestamp:baseline.toISOString(), _created_at:new Date()}]);
            
            const delEvents$ =  this.restFulService.deleteMany('Event', { _created_at: { $lt: baseline } }).then(res=>this.writeLog("Deleted Event count: " + res.deletedCount));
            const delSystemLogs$ = this.restFulService.deleteMany('SystemLog', { _created_at: { $lt: baseline } }).then(res=>this.writeLog("Deleted SystemLog count: " + res.deletedCount));
            const delHouseKeeper$ = this.restFulService.deleteMany(this.className, { _created_at: { $lt: baseline } }).then(res=>this.writeLog(`Deleted ${this.className} count: ` + res.deletedCount));
            await Promise.all([delEvents$, delSystemLogs$, delHouseKeeper$]);
        }catch(err){
            this.writeLog(err.toString());
        }
    }
        

}