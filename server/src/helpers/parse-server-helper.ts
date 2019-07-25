import { ParseServer } from 'parse-server';
import { ConfigHelper, ParseHelper, ServerHelper } from './';
const bodyParser = require('body-parser');
export class ParseServerHelper {

    parseServer: ParseServer;

    parseLiveQueryServer: any;

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
        let dbUri = this.parseConfig.DATABASE_URI.indexOf("?replicaSet")>=0?this.parseConfig.DATABASE_URI:this.parseConfig.DATABASE_URI+"?replicaSet=rsCMS3";
        console.log("dbUri", dbUri);
        this.parseServer = new ParseServer({
            databaseURI: dbUri,
            appId: this.parseConfig.APPLICATION_ID,
            masterKey: this.parseConfig.MASTER_KEY,
            fileKey: this.parseConfig.FILE_KEY,
            serverURL: this.parseHelper.parseServerUrl,
            verbose: false,
            silent: true,
            liveQuery: {
                classNames: [
                    "Device"
                ]
            }
        });
        this.serverHelper.app.use(bodyParser.json({limit: '999mb', type: 'application/json'}));
        this.serverHelper.app.use(bodyParser.urlencoded({extended: true}));
        console.log("this.parseServerUrl", this.parseHelper.parseServerUrl);
        this.serverHelper.app.use(this.pathConfig.PARSE_PATH, this.parseServer);        

        this.parseLiveQueryServer = ParseServer.createLiveQueryServer(this.serverHelper.httpServer);
        
    }
}