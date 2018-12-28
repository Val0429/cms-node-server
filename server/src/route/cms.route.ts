import { Router } from 'express';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as xml2js from 'xml2js';
import * as shelljs from 'shelljs';
import { Observable } from 'rxjs/Observable';
import { IRouteMap, ParseHelper, ConfigHelper, LogHelper, SyncHelper } from '../helpers';
import { Nvr, Event, SysLog, Server } from '../domain/core';
import { DeviceService } from '../services';

const parseHelper = ParseHelper.instance;
const configHelper = ConfigHelper.instance;
const logHelper = LogHelper.instance;
const syncHelper = SyncHelper.instance;
const deviceService = DeviceService.instance;

export const CmsRoute: IRouteMap = {
    path: 'cms',
    router: Router().use(bodyParser.json())
        .get('/test', (req, res) => { res.send('Test Success') })        
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
        .get('/device/status', (req, res) => {            
            deviceService.getDeviceStatus(res);
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
        .post('/QueryEvent', (req, res) => {
            parseHelper.fetchData({
                type: Event,
                filter: query => {
                    query.equalTo('NvrId', req.body.NvrId)
                        .equalTo('ChannelId', req.body.ChannelId)
                        .equalTo('Type', req.body.Type)
                        .greaterThanOrEqualTo('Time', req.body.StartUTC)
                        .lessThan('Time', req.body.EndUTC)
                }
            }).then(events => {
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
        // .post('/SysLog', (req, res) => {
        //     // 起始日的Timestamp調整為0:00.0.0, 結束日的Timestamp調整為23:59.59.999
        //     const startTime = req.body.StartDate
        //         ? moment(Number(req.body.StartDate)).utc().toDate().setUTCHours(0, 0, 0, 0)
        //         : moment(0);
        //     const endTime = req.body.EndDate
        //         ? moment(Number(req.body.EndDate)).utc().toDate().setUTCHours(23, 59, 59, 999)
        //         : moment(9999999999999);

        //     parseHelper.fetchPaging({
        //         type: SysLog,
        //         currentPage: req.body.Page || 1,
        //         itemVisibleSize: req.body.Limit || 100,
        //         filter: query => {
        //             if (req.body.Keyword) {
        //                 const querySys = [
        //                     // queryHostEvent.matches('purpose', new RegExp(this.queryParams.purpose), 'i');
        //                     new Parse.Query(SysLog).matches('ServerName', new RegExp(req.body.Keyword), 'i'),
        //                     new Parse.Query(SysLog).matches('Type', new RegExp(req.body.Keyword), 'i'),
        //                     new Parse.Query(SysLog).matches('Description', new RegExp(req.body.Keyword), 'i')
        //                 ];
        //                 Object.assign(query, Parse.Query.or(...querySys));
        //             }
        //             query.greaterThanOrEqualTo('Time', startTime)
        //                 .lessThanOrEqualTo('Time', endTime);
        //         }
        //     }).then(sysLogs => res.json(sysLogs))
        // })
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
        .post('/eventsearch', (req, res) => {
            parseHelper.fetchData({
                type: Event,
                filter: query => {
                    query
                        .greaterThanOrEqualTo('Time', req.body.StartTime)
                        .lessThanOrEqualTo('Time', req.body.EndTime)
                        .limit(30000);
                    if (req.body.EventType && req.body.EventType.length > 0) {
                        query.containedIn('Type', req.body.EventType);
                    }
                }
            }).then(events => {
                let resultEvents = req.body.Channels ? [] : events;
                if (req.body.Channels) {
                    req.body.Channels.forEach(channel => {
                        const subs = events.filter(x => x.NvrId === channel.NvrId && x.ChannelId === channel.ChannelId);
                        resultEvents = resultEvents.concat(subs);
                    });
                }
                const totalRecord = resultEvents.length;
                resultEvents.sort(function (a, b) { // 倒序排序
                    return (a.Time < b.Time) ? 1 : ((b.Time < a.Time) ? -1 : 0);
                });
                const count = req.body.Count || 100;
                const page = req.body.Page || 1;
                const skip = (page - 1) * count;
                res.json({
                    TotalRecords: totalRecord,
                    Page: page,
                    Count: count,
                    Records: resultEvents.slice(skip, skip + count)
                });
            });
            // let channelQueries = [];
            // if (req.body.Channels) {
            //     channelQueries = req.body.Channels.map(data =>
            //         new Parse.Query(Event)
            //             .equalTo('NvrId', data.NvrId)
            //             .equalTo('ChannelId', data.ChannelId));
            // }
            // parseHelper.fetchPagingAndCount({
            //     type: Event,
            //     currentPage: req.body.Page || 1,
            //     itemVisibleSize: req.body.Count || 100,
            //     filter: query => {
            //         query.greaterThanOrEqualTo('Time', req.body.StartTime)
            //             .lessThanOrEqualTo('Time', req.body.EndTime)
            //         if (req.body.EventType && req.body.EventType.length > 0) {
            //             query.containedIn('Type', req.body.EventType);
            //         }
            //         if (channelQueries.length > 0) {
            //             Object.assign(query, Parse.Query.or(...channelQueries));
            //             // Object.assign之後重新設定分頁
            //             query.limit(req.body.Count);
            //             query.skip((req.body.Page - 1) * req.body.Count);
            //         }
            //     }
            // }).then(events => res.json({
            //     TotalRecords: events.count,
            //     Page: req.body.Page || 1,
            //     Count: req.body.Count || 100,
            //     Records: events.data
            // }))
        })
        .post('/eventcalendar', (req, res) => {
            parseHelper.fetchData({
                type: Event,
                filter: query => {
                    query
                        .greaterThanOrEqualTo('Time', req.body.StartTime)
                        .lessThanOrEqualTo('Time', req.body.EndTime);
                    if (req.body.EventType && req.body.EventType.length > 0) {
                        query.containedIn('Type', req.body.EventType);
                    }
                }
            }).then(events => {
                let resultEvents = req.body.Channels ? [] : events;
                if (req.body.Channels) {
                    req.body.Channels.forEach(channel => {
                        const subs = events.filter(x => x.NvrId === channel.NvrId && x.ChannelId === channel.ChannelId);
                        resultEvents = resultEvents.concat(subs);
                    });
                }

                const result: { Date: number, Events: { Type: string, Count: number }[] }[] = [];
                resultEvents.forEach(event => {
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
                });

                res.send(JSON.stringify({ Records: result }));
            })
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
