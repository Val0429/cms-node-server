import { Router } from 'express';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as xml2js from 'xml2js';
import * as shelljs from 'shelljs';
import { Observable } from 'rxjs/Observable';
import { IRouteMap, ParseHelper, ConfigHelper, LogHelper, SyncHelper } from '../helpers';
import { Nvr, Event,  Server } from '../domain/core';
import { DeviceService, RestFulService } from '../services';

const parseHelper = ParseHelper.instance;
const configHelper = ConfigHelper.instance;
const logHelper = LogHelper.instance;
const syncHelper = SyncHelper.instance;
const deviceService = DeviceService.instance;
const restFulService = RestFulService.instance;
const eventMapping = [
    {key:"LocalDiskError", value:"hddWriteError"},
	{key:"VideoLoss", value:"VideoServerVideoLost"},
	{key:"VideoRecovery", value:"VideoServerVideoRecovery"},
	{key:"RecordResume", value:"RecordStart"},
	{key:"NVRConnect", value:"BackendRecordStart"},
	{key:"NVRDisconnect", value:"BackendRecordStop"}
];

function sanitizeEvent(input:string):string{    
    let found = eventMapping.find(x=>x.key == input);
    return found ? found.value : input;
}
function revertEvent(input:string):string{    
    let found = eventMapping.find(x=>x.value == input);
    return found ? found.key : input;
}
export const CmsRoute: IRouteMap = {
    path: 'cms',
    router: Router().use(bodyParser.json())
        .get('/test', (req, res) => { res.send('Test Success') })
        .get('/data/:className', async(req, res)=>{
            await restFulService.get(req, res);
        })     
        .get('/count/:className', async(req, res)=>{
            await restFulService.getCount(req, res);
        })
        .get('/data/:className/:_id', async(req, res)=>{
            await restFulService.getById(req, res);
        })  
        .put('/data/:className/:_id', async(req, res)=>{
            await restFulService.putById(req, res);
        })
        .post('/data/:className', async(req, res)=>{
            await restFulService.post(req, res);
        })   
        .delete('/data/:className', async(req, res)=>{
            await restFulService.del(req, res);
        }) 
        .get('/externalconfig', (req, res) => {
            res.json(configHelper.externalConfig);
        })
        .get('/device/channel/:nvrId?/:count?', async (req, res) => {
            await deviceService.getNewChannel(req, res);
        })
        .get('/device/count/:nvrId?', async (req, res) => {
            await deviceService.getDeviceCountByNvrId(req, res);
        })
        .get('/device', async (req, res) => {            
            await deviceService.get(req, res);
        })
        .delete('/device', async (req, res) => {
            await deviceService.delete(req, res);
        })
        .post('/device/clone', async (req, res) => {            
            await deviceService.cloneDevice(req, res);
        })
        .post('/device', async (req, res) => {            
            await deviceService.post(req, res);
        })
        .delete('/nvr', async (req, res) => {            
            await deviceService.delNvr(req, res);
        })
        .post('/nvr', async (req, res) => {            
            await deviceService.postNvr(req, res);
        })
        .get('/SetDBSyncDisable', (req, res) => {
            syncHelper.setAutoSyncDefault();
            res.send(true);
        })
        .get('/IPCameraNvrId', (req, res) => {
            parseHelper.getData({
                type: Nvr,
                filter: query => query.equalTo('Driver', 'IPCamera')
            }).then(nvr => {
                res.json(nvr.Id);
            })
        })
        .get('/MediaUrl', (req, res) => {
            parseHelper.getData({
                type: Server
            }).then(server => {
                const url = `http://${server.MediaServer.Domain}:${server.MediaServer.Port}`;
                res.json(url);
            })
        })
        .post('/login', (req, res) => {
            const login$ = Observable.fromPromise(Parse.User.logIn(
                req.body.username,
                req.body.password
            )).toPromise();
            login$.then(user => {
                res.json(user);
            }).catch(error => {
                // 登入失敗可能有ResponseCode為200的狀況，強制改成101
                res.json({
                    code: error.code === 200 ? 101 : error.code,
                    message: error.message
                });
            });
        })
        .post('/QueryEvent', async (req, res) => {
            console.log("req.body", req.body);
            let where = {};
            where['NvrId'] = req.body.NvrId;
            where['ChannelId'] = req.body.ChannelId;
            where['Type']= req.body.Type;
            where['Time']= {"$gte":req.body.StartUTC, "$lte":req.body.EndUTC};            
            console.log("QueryEvent where", where);
            await restFulService.getData("Event",0,Number.MAX_SAFE_INTEGER, where).then(events => {
                const totalSeconds = moment.duration(moment(Number(req.body.EndUTC)).diff(moment(Number(req.body.StartUTC)))).asSeconds();
                if (events && events.length > 0) { // at least one event
                    // 取得所有Event與起始時間的間隔秒數
                    const secondArray: number[] = [];
                    for (let i = 0; i < events.length; i++) {
                        const second = Math.floor(moment.duration(
                            moment(Number(events[i].Time)).diff(moment(Number(req.body.StartUTC)))).asSeconds());
                        if (!secondArray.some(x => x === second)) {
                            secondArray.push(second);
                        }
                    }
                    var durationArray = []; // Final result array
                    if (secondArray[0] === 0) { // 第一筆Event發生在搜尋範圍內的0秒位置, 故start with 1
                        durationArray.push(1); // 起始為1
                    } else {
                        durationArray.push(0); // 起始為0
                        durationArray.push(secondArray[0]); // 持續到第一筆資料時間
                    }
                    durationArray.push(1); // 持續1秒
                    for (let i = 1; i < secondArray.length; i++) {
                        if (secondArray[i] - secondArray[i - 1] === 1) {
                            durationArray[durationArray.length - 1]++;
                        } else {
                            durationArray.push(secondArray[i] - secondArray[i - 1] - durationArray[durationArray.length - 1]);
                            durationArray.push(1);
                        }
                    }
                    var remainSeconds = totalSeconds - secondArray[secondArray.length - 1] - 1;
                    if (remainSeconds > 0) {
                        durationArray.push(remainSeconds);
                    }
                } else { // No event between query time
                    durationArray.push(0);
                    durationArray.push(totalSeconds);
                }
                res.send(JSON.stringify({ Parts: durationArray.join('-') }));
            })
        })
        .post('/BrandCapability', (req, res) => {
            fs.readFile(path.join(__dirname, '../assets/brandXml/') + req.body.fileName, function (err, data) {
                err ? res.json({ Devices: [] }) :
                    xml2js.parseString(data, { explicitArray: false }, (err, result) => {
                        err ? res.json(err) : res.json(result);
                        // fs.writeFile(path.join(__dirname, '../assets/brandJson/') + req.body.fileName + '.json', JSON.stringify(result), function (err) {
                        //     if (err) {
                        //         console.log(err);
                        //     }
                        // });
                    })
            })
        })
        .post('/eventsearch',  async (req, res) => {            

            try{                    
                let where={};
                console.log("search body", req.body);
                where["Time"]={"$gte":req.body.StartTime, "$lte":req.body.EndTime};
                let eventTypes = [];
                for(let et of req.body.EventType){
                    eventTypes.push(sanitizeEvent(et));
                }
                where["Type"]={"$in":eventTypes};
                
                if (req.body.Channels && req.body.Channels.length > 0) {
                    constructDeviceFilter(req, where);
                }
                
                console.log("eventsearch where", where);
                let totalRecord=0;let events=[];
                const totalRecord$ = restFulService.getDataCountWithLimit("Event", where).then(res=>totalRecord=res);;
                const count = req.body.Count || 100;
                const page = req.body.Page || 1;
                const skip = (page - 1) * count;

                let events$ = restFulService.getData("Event", skip, count, where).then(res=>{                    
                    events=res;
                    for(let event of events)event.Type = revertEvent(event.Type);
                });
                await Promise.all([totalRecord$, events$]);
                //console.log(events);
                res.json({
                    TotalRecords: totalRecord,
                    Page: page,
                    Count: count,
                    Records: events
                });
            }
            catch(err){
                console.error(err);
                res.status(err.status || 500);
                res.json({
                    message: err.message,
                    error: err
                });
            }
        })
        .post('/eventcalendar', async (req, res) => {
            try{
                //console.log("req.body", req.body);
                let where={};
                    where["Time"]={"$gte":req.body.StartTime, "$lte":req.body.EndTime};                    
                    if(req.body.EventType && req.body.EventType.length>0){                        
                        let eventTypes = [];
                        for(let et of req.body.EventType){
                            eventTypes.push(sanitizeEvent(et));
                        }
                        where["Type"]={"$in":eventTypes};
                    }
                    if (req.body.Channels && req.body.Channels.length > 0) {                    
                        constructDeviceFilter(req, where);
                    }
                console.log("eventcalendar where",where);
                await restFulService.getData("Event", 0, Number.MAX_SAFE_INTEGER, where).then(resultEvents => { 
                    const result: { Date: number, Events: { Type: string, Count: number }[] }[] = [];
                    for(let event of resultEvents){
                        event.Type = revertEvent(event.Type);                        
                        const eventTime = new Date(event.Time).getDate(); // 取得Day-of-the-month作為key
                        // 檢查時間，若尚未出現就新增物件
                        if (!result.some(x => x.Date === eventTime)) {
                            result.push({ Date: eventTime, Events: [] });
                        }

                        const resultEvent = result.find(x => x.Date === eventTime);
                        const sameTypeItem = resultEvent.Events.find(tp => tp.Type === event.Type);
                        if (sameTypeItem) {
                            sameTypeItem.Count++;
                        } else {
                            resultEvent.Events.push({ Type: event.Type, Count: 1 });
                        }
                    }
                    res.send({ Records: result });
                })
            }
            catch(err){
                console.error(err);
                res.status(err.status || 500);
                res.json({
                    message: err.message,
                    error: err
                });
            }
        })
        .post('/syncDB', (req, res) => {
            if (!req.body.sourceUrl) {
                res.json('Host url error, sync failed.');
                return;
            }

            const databaseName = 'CMS3';
            const backupFileName = 'sync.gz';
            let dumpCmd = `"C:/Program Files/MongoDB/Server/3.4/bin/mongodump.exe" --host=${req.body.sourceUrl} --archive=${backupFileName} --gzip --db ${databaseName}`;
            const restoreCmd = `"C:/Program Files/MongoDB/Server/3.4/bin/mongorestore.exe" --drop --archive=${backupFileName} --gzip --db ${databaseName}`;

            if (req.body.exclude) {
                req.body.exclude.forEach(collectionName => {
                    dumpCmd += ` --excludeCollection=${collectionName}`;
                });
            }
            const logType = 'DB Backup';
            try {
                logHelper.writeLog({ type: logType, msg: `Start to sync data from ${req.body.sourceUrl}` });
                shelljs.exec(dumpCmd);
                shelljs.exec(restoreCmd);
                const resultMsg = `Sync data finished.`;
                logHelper.writeLog({ type: logType, msg: resultMsg });
                res.json(resultMsg);
            } catch (error) {
                const resultMsg = `Sync data failed, message:${error}`;
                logHelper.writeLog({ type: logType, msg: resultMsg });
                res.json(resultMsg);
            }

            // mongodb.MongoClient.connect(configHelper.parseConfig.DATABASE_URI, function (err, db) {
            //     if (err) {
            //         res.json(err);
            //         return;
            //     }

            //     // const tenMinBefore = moment(new Date()).add(-10, 'm');
            //     // const mongoCommand = { copydb: 1, fromhost: req.body.sourceUrl, fromdb: "CMS3", todb: "CMS3" };
            //     // const mongoCommand = {
            //     //     cloneCollection: "CMS3.nvr",
            //     //     from: req.body.sourceUrl
            //     // };
            //     // const admin = db.admin();

            //     // db.getSiblingDB("CMS3").runCommand({
            //     //     cloneCollection: "CMS3.nvr",
            //     //     from: req.body.sourceUrl,
            //     //     query: { 'updatedAt': { $gte: tenMinBefore } }
            //     // });

            //     // db.close();
            //     // res.send('Sync Test')

            //     // admin.command(mongoCommand, function (commandErr, data) {
            //     //     if (!commandErr) {
            //     //         res.json(`Sync data from ${req.body.sourceUrl} success at ${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}`);
            //     //     } else {
            //     //         res.json(`Sync data from ${req.body.sourceUrl} failed at ${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}, message:${commandErr.errmsg}`);
            //     //     }
            //     //     db.close();
            //     // });
            // });
        }),
    children: []
}
function constructDeviceFilter(req:any, where: {}) {
    let or = [];
    let nvrIds = [];
    for(let channel of req.body.Channels){
        let found = nvrIds.find(x=>x==channel.NvrId);
        if(found)continue;

        nvrIds.push(channel.NvrId);
        let and = [];
        let channels = req.body.Channels.filter(x=>x.NvrId == channel.NvrId).map(x=>x.ChannelId);
        channels.push(0);
        and.push({ "NvrId": channel.NvrId });
        console.log("channels", channels);
        and.push({ "ChannelId": { "$in": channels } });
        console.log("and", and);
        or.push({ "$and": and });
        
    }   
    
    where["$or"] = or;
}

