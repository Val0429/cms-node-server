import { Router } from 'express';
import * as bodyParser from 'body-parser';
import * as xml2js from 'xml2js';
import { IRouteMap, LogHelper } from '../helpers';
import { ConfigHelper } from "../helpers";
import { RestFulService } from '../services';
import * as ProtoBuf from 'protobufjs';
import * as request from 'request-promise';
import * as dgram from 'dgram';
//allow self signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


const logHelper = LogHelper.instance;
const configHelper = ConfigHelper.instance;
const restFulService = RestFulService.instance;

export const ProxyRoute: IRouteMap = {
    path: 'proxy',
    router: Router().use(bodyParser.json())
        .get('/test', (req, res) => { res.send('Proxy Test') })
        .put('/udp', (req, res)=> {            
            let payload = {
                "min_level":"debug",
                "keep_days":30,	
                "log_path":".\\log",
                "port":30678,	
                "logger":
                [
                    {
                        "category":"ServerLog",		
                        "console_output":false,
                        "log_file_name":"ServerLog"
                    },
                    {
                        "category":"CgiLog",		
                        "console_output":false,
                        "log_file_name":"ServerLog"	
                    },
                    {
                        "category":"DriverLog",
                        "console_output":false,
                        "log_file_name":"DriverLog",
                        "upload_parse_db":false
                    },
                ],  
                "parse_server":
                {		
                    "domain":"127.0.0.1",
                    "port":3000,
                    "source":"Server Info 3",
                    "app_id":"CMS3-Parse-API"
                }
            };
            
            payload.parse_server.domain=req.body.host;
            payload.parse_server.port=req.body.port;
            payload.parse_server.source = req.body.source;
            //console.log(payload);
            ProtoBuf.load('udplog.proto', function(err, root) {
                if (err){
                    res.status(500);
                    res.send({message:"failure1", err});
                    return;
                }
                //console.log(root);
                var data = {
                    fileName: 'SaveSetting',
                    level: 9999,
                    payload: new Buffer(JSON.stringify(payload))
                };
                
                var logContent:any = root.lookup('udplog.LogContent');
                var msgBuffer = logContent.encode(data).finish();
                //console.log(msgBuffer);
               

                var client = dgram.createSocket('udp4');
                
                client.send(msgBuffer,0, msgBuffer.length, 30678, req.body.sourceAddress, function(err, bytes) {
                    if (err){
                        res.status(500);
                        res.send({message:"failure2", err});
                        return;
                    }
                    client.close();
                });
                res.send({message:"success"});
            });
        })
        .post('/:_id?', async (req, res) => {
            if (!req.body || !req.body.path) {
                res.send({});
                return;
            }
            try{
                let where= !req.params["_id"] ? {"Type":"CMSManager"} : {"_id":req.params["_id"]};
                // 先取得MediaServer的連線URL再轉發
                let serverInfo = await restFulService.getFirstData("ServerInfo",where);
                
                let port = serverInfo.Port;                
                let protocol = "http";
                
                if(req.secure && serverInfo.SSLPort){
                    port= serverInfo.SSLPort;
                    protocol="https";
                } 
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