import * as nconf from 'nconf';
import * as path from 'path';
import * as fs from 'fs';
import { LogHelper } from './log-helper';

export class ConfigHelper {
    private static _instance: ConfigHelper;

    public static get instance() {
        return this._instance || (this._instance = new this());
    }

    logHelper = LogHelper.instance;

    /** Parse Server Config */
    parseConfig: IParseConfig;
    /* external config */
    externalConfig:ExternalConfig;
    /** Server Default Path Config */
    pathConfig: IPathConfig;

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        
        this.externalConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'external.config.json'), 'utf8'));

        this.parseConfig = this.readConfig('parse.config.json');
        this.pathConfig = this.readConfig('path.config.json');
        
    }

    readConfig(filePath: string): any {
        return nconf.argv().env().file({ file: path.join(__dirname, '..', 'config', filePath) }).get();
    }
}
export interface ExternalConfig{
    houseKeeper:{
        keepDays:number,
        cycleInterval:number
    }
};
export interface IParseConfig {
    PORT?: number;
    SSL_PORT?: number;
    IS_HTTPS?: boolean;
    HOST?: string;
    DATABASE_URI?: string;
    APPLICATION_ID?: string;
    JAVASCRIPT_KEY?: string;
    MASTER_KEY?: string;
    FILE_KEY?: string;
    DB_BACKUP_PERIOD?: number;
    USE_MULTI_THREADS?:boolean;
}

export interface IPathConfig {
    PARSE_PATH?: string;
    PARSE_DASHBOARD_PATH?: string;
}

export interface ISyncConfig {
    AUTO_SYNC: boolean,
    DESTINATION: { URL: string }[]   
}
