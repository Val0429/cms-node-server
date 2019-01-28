import { Router } from 'express';
import * as bodyParser from 'body-parser';
import * as xml2js from 'xml2js';
import { IRouteMap, LogHelper } from '../helpers';
import { ConfigHelper } from "../helpers";
import { RestFulService } from '../services';
//allow self signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const request = require('request-promise');
const logHelper = LogHelper.instance;
const configHelper = ConfigHelper.instance;
const restFulService = RestFulService.instance;
export const ProxyRoute: IRouteMap = {
    path: 'proxy',
    router: Router().use(bodyParser.json())
        .get('/test', (req, res) => { res.send('Proxy Test') })
        .post('/:_id?', async (req, res) => {
            if (!req.body || !req.body.path) {
                res.send({});
                return;
            }
            try{
                let where= !req.params["_id"] ? {"Type":"CMSManager"} : {"_id":req.params["_id"]};
                // 先取得MediaServer的連線URL再轉發
                let serverInfo = await restFulService.getFirstData("ServerInfo",where);
                
                let protocol = configHelper.parseConfig.IS_HTTPS && serverInfo.SSLPort ? 'https' : 'http';
                let port = configHelper.parseConfig.IS_HTTPS && serverInfo.SSLPort ? serverInfo.SSLPort : serverInfo.Port;

                const mediaUrl = `${protocol}://${serverInfo.Domain}:${port}`;

                const path = req.body.domainPath ?
                    req.body.domainPath + req.body.path :
                    mediaUrl + req.body.path;

                console.log('proxy path: ', path);

                const options = {
                    uri: path,
                    timeout: 0, 
                    method: req.body.method || 'GET',
                    headers: req.body.headers,
                    body: typeof req.body.body === 'string'
                        ? req.body.body
                        : JSON.stringify(req.body.body)
                };
            
            
                return await request(options)
                    .then(data => convertToJsonRes(data, res));
            }catch(err){
                logHelper.writeLog({ type: 'Proxy', msg: err.message });                
                res.status(500);
                res.json({ type: 'Proxy', msg: err.message });
            }
        }),
    children: []
}

function convertToJsonRes(response, res) {
    const xml = response.body || response;
    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) {
            res.json(response);
        } else {
            res.json(result);
        }
    })
}