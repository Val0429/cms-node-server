import { ParseServer } from 'parse-server';
import { ConfigHelper, ParseHelper, ServerHelper } from './';

export class ParseServerHelper {

    parseServer: ParseServer;

    parseLiveQueryServer: any;

    parseLiveQueryServerSSL: any;

    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: ParseServerHelper;

    private parseHelper = ParseHelper.instance;

    private serverHelper = ServerHelper.instance;

    private parseConfig = ConfigHelper.instance.parseConfig;

    private pathConfig = ConfigHelper.instance.pathConfig;

    constructor() {
        this.initParseServer();
    }

    initParseServer() {
        this.parseServer = new ParseServer({
            databaseURI: this.parseConfig.DATABASE_URI,
            appId: this.parseConfig.APPLICATION_ID,
            masterKey: this.parseConfig.MASTER_KEY,
            fileKey: this.parseConfig.FILE_KEY,
            serverURL: this.parseHelper.parseServerUrl,
            verbose: false,
            silent: true,
            // liveQuery: {
            //     'classNames': [
            //         'VisitEvent',
            //         'Visitor',
            //         'HostEvent',
            //         'Host'
            //     ]
            // }
        });

        this.serverHelper.app.use(this.pathConfig.PARSE_PATH, this.parseServer);

        // this.parseLiveQueryServer = ParseServer.createLiveQueryServer(this.serverHelper.httpServer);

        // if (this.parseConfig.IS_HTTPS) {
        //     this.parseLiveQueryServerSSL = ParseServer.createLiveQueryServer(this.serverHelper.httpServerSSL);
        // }
    }
}