import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { ConfigHelper } from './config-helper';
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
    
    
export class ServerHelper {

    app: express.Express;

    httpServer: http.Server;

    httpServerSSL: https.Server;

    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: ServerHelper;

    private parseConfig = ConfigHelper.instance.parseConfig;

    constructor() {
        this.initExpress();
    }

    private initExpress() {
        this.app = express();
        this.httpServer = http.createServer(this.app);
        
        
        if (this.parseConfig.IS_HTTPS) {
            let options={
                key: fs.readFileSync(path.join(__dirname, '../assets/ssl/mykey.pem')).toString(),
                cert: fs.readFileSync(path.join(__dirname, '../assets/ssl/mycert.pem')).toString()
            };
            this.httpServerSSL = https.createServer(options, this.app);
        }
    }

    runServer() {
            
        // if (cluster.isMaster&&this.parseConfig.USE_MULTI_THREADS===true) {
        //     for (var i = 0; i < numCPUs; i++) {
        //         cluster.fork();
        //     }
        // }
        // else {
            this.httpServer.listen(this.parseConfig.PORT, () =>
                console.log(`Works served at port ${this.parseConfig.PORT}.`));

            if (this.parseConfig.IS_HTTPS) {
                this.httpServerSSL.listen(this.parseConfig.SSL_PORT, () =>
                    console.log(`Works served at port ${this.parseConfig.SSL_PORT}.`));
            }
        //}
    }
}