import * as ParseDashboard from 'parse-dashboard';
import { ConfigHelper } from './config-helper';
import { ParseHelper } from './parse-helper';
import { ServerHelper } from './server-helper';

export class ParseDashboardHelper {
    parseDashboardHttps: any;
    parseDashboard: any;

    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: ParseDashboardHelper;

    private parseHelper = ParseHelper.instance;

    private serverHelper = ServerHelper.instance;

    private parseConfig = ConfigHelper.instance.parseConfig;

    private pathConfig = ConfigHelper.instance.pathConfig;

    constructor() {
        this.initParseDashboard();
    }

    initParseDashboard() {
        this.parseDashboard = new ParseDashboard({
            apps: [
                {
                    appName: 'iSAP-CMS-Server',
                    appId: this.parseConfig.APPLICATION_ID,
                    masterKey: this.parseConfig.MASTER_KEY,
                    serverURL: this.parseHelper.parseServerUrl
                }
            ],
            users: [
                { user: 'admin', pass: 'iSap2017' }
            ]
        }, { allowInsecureHTTP: true });

        this.serverHelper.app.use(this.pathConfig.PARSE_DASHBOARD_PATH, this.parseDashboard);

        if(this.parseConfig.IS_HTTPS){
            this.parseDashboardHttps = new ParseDashboard({
                apps: [
                    {
                        appName: 'iSAP-CMS-Server',
                        appId: this.parseConfig.APPLICATION_ID,
                        masterKey: this.parseConfig.MASTER_KEY,
                        serverURL: this.parseHelper.parseServerHttpsUrl
                    }
                ],
                users: [
                    { user: 'admin', pass: 'iSap2017' }
                ]
            }, { allowInsecureHTTP: true });
    
            this.serverHelper.app.use(this.pathConfig.PARSE_DASHBOARD_PATH, this.parseDashboardHttps);
        }
    }
}