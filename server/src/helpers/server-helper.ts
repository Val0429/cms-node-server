import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { ConfigHelper } from './config-helper';

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
            this.httpServerSSL = https.createServer({
                key: fs.readFileSync(path.join(__dirname, '../assets/ssl/private.key')).toString(),
                cert: fs.readFileSync(path.join(__dirname, '../assets/ssl/certificate.crt')).toString()
            }, this.app);
        }
    }

    runServer() {
        this.httpServer.listen(this.parseConfig.PORT, () =>
            console.log(`Works served at port ${this.parseConfig.PORT}.`));

        if (this.parseConfig.IS_HTTPS) {
            this.httpServerSSL.listen(this.parseConfig.SSL_PORT, () =>
                console.log(`Works served at port ${this.parseConfig.SSL_PORT}.`));
        }
    }
}