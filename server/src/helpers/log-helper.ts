import * as fs from 'fs';
import * as moment from 'moment';
export class LogHelper {
    private static _instance: LogHelper;

    public static get instance() {
        return this._instance || (this._instance = new this());
    }

    defaultLogDir = 'logs';

    constructor() {
        if (!fs.existsSync(this.defaultLogDir)){
            fs.mkdirSync(this.defaultLogDir);
        }
    }

    /** 寫入msg至指定file, 若無則寫入預設檔案 */
    writeLog(args: { type: string, msg: string }) {
        try{
            const writeTime = moment(new Date());
            const writePath = `${this.defaultLogDir}/${writeTime.format('YYYYMMDD')}.txt`;
            const logMsg = `[${writeTime.format('YYYY-MM-DD HH:mm:ss')}] [${args.type}] ${args.msg}\r\n`;
            console.log(logMsg);
            if (!fs.existsSync(writePath)) {
                fs.writeFile(writePath, logMsg, err =>{
                    console.error("error writing log", err);        
                });
            } else {
                fs.appendFile(writePath, logMsg, err =>{
                    console.error("error writing log", err);        
                });
            }
        }catch(err){
            console.error("error writing log", err);
        }
    }
}