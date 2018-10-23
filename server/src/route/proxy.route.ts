import { Router } from 'express';
import * as bodyParser from 'body-parser';
import * as xml2js from 'xml2js';
import * as got from 'got';
import * as fetch from 'node-fetch';
import { IRouteMap, ParseHelper, LogHelper } from '../helpers';
import { ServerInfo } from '../domain/core';
import { DH_UNABLE_TO_CHECK_GENERATOR } from 'constants';

const parseHelper = ParseHelper.instance;
const logHelper = LogHelper.instance;

export const ProxyRoute: IRouteMap = {
    path: 'proxy',
    router: Router().use(bodyParser.json())
        .get('/test', (req, res) => { res.send('Proxy Test') })
        .post('/', (req, res) => {
            if (!req.body || !req.body.path) {
                res.send({});
                return;
            }

            // 先取得MediaServer的連線URL再轉發
            parseHelper.getData({
                type: ServerInfo,
                filter: query => {
                    query.matches('Type', new RegExp('CMSManager'), 'i')
                }
            }).then(serverInfo => {
                const mediaUrl = `http://${serverInfo.Domain}:${serverInfo.Port}`;

                const path = req.body.domainPath ?
                    req.body.domainPath + req.body.path :
                    mediaUrl + req.body.path;

                console.log('proxy path: ', path);

                const requestInit = {
                    method: req.body.method || 'GET',
                    headers: req.body.headers,
                    body: typeof req.body.body === 'string'
                        ? req.body.body
                        : JSON.stringify(req.body.body)
                };

                fetch(path, requestInit)
                    .then(data => data.text())
                    .then(data => convertToJsonRes(data, res))
                    .catch(err => logHelper.writeLog({ type: 'Proxy', msg: err.message }));
            })
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