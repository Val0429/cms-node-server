// import * as express from 'express';
// import * as fs from 'fs';
// import * as http from 'http';
// import * as https from 'https';
// import * as ParseDashboard from 'parse-dashboard';
// import { ParseServer } from 'parse-server';
// import * as path from 'path';
// import { ConfigHelper } from './helpers';


// server instance
// const app = express();

// 將 config.json 暫存進全域變數
// app.set('config', config);

// const httpServer = http.createServer(app);
// const httpServerSSL = https.createServer({
//     key: fs.readFileSync('ssl/private.key').toString(),
//     cert: fs.readFileSync('ssl/certificate.crt').toString()
// }, app);

// Parse Server
// const parseServer = new ParseServer({
//     databaseURI: config.DATABASE_URI,
//     appId: config.APPLICATION_ID,
//     masterKey: config.MASTER_KEY,
//     fileKey: config.FILE_KEY,
//     serverURL: config.SERVER_URL,
//     verbose: false,
//     silent: true,
//     liveQuery: {
//         'classNames': [
//             // 'Location',
//             // 'LocationChannel',
//             // 'ScanEvent',
//             // 'ScanEventVideo',
//             // 'Configuration'
//         ]
//     }
// });

// Parse Dashboard
// const parseDashboard = new ParseDashboard({
//     apps: [
//         {
//             appName: 'iSAP',
//             appId: config.APPLICATION_ID,
//             masterKey: config.MASTER_KEY,
//             serverURL: config.SERVER_URL
//         }
//     ],
//     users: [
//         { user: 'admin', pass: 'iSap2017' }
//     ]
// }, { allowInsecureHTTP: true });

// app.use(ConfigHelper.pathConfig.PARSE_PATH, parseServer);
// app.use(ConfigHelper.pathConfig.PARSE_DASHBOARD_PATH, parseDashboard);

// const webPath = '../web/dist';
// // const webPath = '../web';
// app.use('/web', express.static(path.join(__dirname, webPath), { redirect: false }));
// app.get('*', function (req, res, next) {
//     res.sendFile(path.join(__dirname, webPath, '/index.html'));
// });

// // 重新導向至 Web
// app.get('/', (req, res) => res.redirect('/web'));

// const parseLiveQueryServer = ParseServer.createLiveQueryServer(httpServer);
// const parseLiveQueryServerSSL = ParseServer.createLiveQueryServer(httpServerSSL);

// httpServer.listen(ConfigHelper.parseConfig.PORT, () => console.log(`Works served at ${ConfigHelper.parseConfig.SERVER_URL}, Port: ${ParseConfig.PORT}.`));
// httpServerSSL.listen(ConfigHelper.parseConfig.SSL_PORT, () => console.log(`Works served at ${ConfigHelper.parseConfig.SERVER_URL}, Port: ${ParseConfig.SSL_PORT}.`));
// httpServer.listen(ConfigHelper.parseConfig.PORT, () => console.log(`Works served at port ${ConfigHelper.parseConfig.PORT}.`));
// httpServerSSL.listen(ConfigHelper.parseConfig.SSL_PORT, () => console.log(`Works served at port ${ConfigHelper.parseConfig.SSL_PORT}.`));


// import * as http from 'http';
// import * as https from 'https';
// import * as express from 'express';
// import * as ParseDashboard from 'parse-dashboard';
// import * as nconf from 'nconf';
// import * as path from 'path';
// import * as crypto from 'crypto';
// import * as fs from 'fs';
// import * as Parse from 'parse';
// import * as fetch from 'node-fetch';
// import * as _ from 'lodash';

// import * as bodyParser from 'body-parser';

// import { ParseServer } from 'parse-server';
// import { Observable } from 'rxjs/Rx';

// // ssl support
// const options = {
//     key: fs.readFileSync('server/private.key').toString(),
//     cert: fs.readFileSync('server/certificate.crt').toString()
// };
// nconf.argv().env().file({ file: 'web/assets/config/parse.config.json' });

// const PORT = process.env.PORT || 1337;
// const SSL_PORT = process.env.SSL_PORT || 443;

// const app = express();
// const httpServer: http.Server = http.createServer(app);
// const httpServerSSL: https.Server = https.createServer(options, app);

// // setup parse
// const configSvr = {
//     appId: nconf.get('APPLICATION_ID'),
//     masterKey: nconf.get('MASTER_KEY'),
//     fileKey: nconf.get('FILE_KEY'),
//     serverURL: nconf.get('SERVER_URL'),
//     appName: 'Works',
//     databaseURI: nconf.get('DATABASE_URI') || 'mongodb://localhost:27017/dev',
//     verbose: false,
//     silent: true,
//     liveQuery: {
//         'classNames': [
//             'VisitEvent',
//             'Visitor',
//             'HostEvent',
//             'Host'
//         ]
//     }
// };

// const apiParse = new ParseServer(configSvr);
// const parseLiveQueryServer = ParseServer.createLiveQueryServer(httpServer);
// const parseLiveQueryServerSSL = ParseServer.createLiveQueryServer(httpServerSSL);
// app.use(process.env.PARSE_MOUNT_PATH || '/parse', apiParse);

// // setup dashboard
// const configDsh = {
//     apps: [{
//         serverURL: nconf.get('SERVER_URL'),
//         appId: nconf.get('APPLICATION_ID'),
//         masterKey: nconf.get('MASTER_KEY'),
//         appName: 'Works',
//     }],
//     users: [{
//         'user': 'admin',
//         'pass': 'iSap2017'
//     }]
// };
// const dashboard = new ParseDashboard(configDsh, true);
// app.use('/parse-dashboard', dashboard);

// const rootPath = 'web/';
// const router = express.Router();
// app.use('/', express.static(rootPath));
// router.get('*', function (req, res) {
//     res.sendFile(path.join(__dirname, '../' + rootPath, '/index.html'));
// });
// app.use('/', router);


// app.get('/', function (req, res) {
//     res.redirect('/');
// });

// // starting server
// httpServer.listen(PORT, function () {
//     console.log(`Works served at ${nconf.get('SERVER_URL')} :${PORT}.`);
// });
// httpServerSSL.listen(SSL_PORT, function () {
//     console.log(`Works served at ${nconf.get('SERVER_URL')} :${SSL_PORT}.`);
// });


// Observable.timer(0, 60000).do(() => {

//     fetch('https://xeric.itt-support.com/api/v2/queryfacealerts.php?session_id=i9ce1fvoPH&duration=1')
//         .then(res => res.json())
//         .then(results => {
//             if (!Array.isArray(results)) {
//                 return;
//             }

//             let datas = results
//                 .filter(result =>
//                     Array.isArray(result.faceevents) &&
//                     result.faceevents.length > 0 &&
//                     result.faceevents[0] &&
//                     Array.isArray(result.faceevents[0].facealerts) &&
//                     result.faceevents[0].facealerts.length > 0 &&
//                     result.faceevents[0].facealerts[0])
//                 .map(result => {
//                     const faceevent = result.faceevents[0];
//                     const facealert = faceevent.facealerts[0];
//                     return {
//                         channel: faceevent.channel,
//                         site_name: faceevent.site_name,
//                         channel_name: faceevent.channel_name,
//                         match_person_name: facealert.match_person_name,
//                         match_person_id_number: facealert.match_person_id_number,
//                         match_person_image: facealert.match_person_image,
//                         score: facealert.score,
//                     };
//                 })
//                 .filter(data =>
//                     data.channel === nconf.get('CHANNEL') &&
//                     data.site_name === nconf.get('SITE_NAME') &&
//                     data.channel_name === nconf.get('CHANNEL_NAME') &&
//                     +data.score >= +nconf.get('SCORE')
//                 );

//             if (datas.length < 1) {
//                 return;
//             }

//             datas = _.uniqBy(datas, 'match_person_id_number');

//             console.log(datas);
//             console.log('-----');

//             Observable.from(datas)
//                 .mergeMap(data => {
//                     const query = new Parse.Query('VisitEvent');
//                     query.equalTo('name', data.match_person_name);
//                     query.equalTo('documentNumber', data.match_person_id_number);
//                     query.equalTo('reference', undefined);
//                     query.equalTo('status', 'Check-In');
//                     const event$ = query.first().then(event => {
//                         if (!event) {
//                             return;
//                         }
//                         const checkOutEvent = event.clone();
//                         checkOutEvent.set('status', 'Check-Out');
//                         checkOutEvent.set('triggerAt', new Date());
//                         // checkOutEvent.set('liveAvatarImage', data.match_person_image);
//                         return checkOutEvent.save().then(_checkOutEvent => {
//                             console.log('check-out success');
//                             event.set('reference', _checkOutEvent);
//                             return event.save();
//                         });
//                     });
//                     return event$;
//                 })
//                 .toArray()
//                 .subscribe();
//         });

// }).subscribe();

// export default app;
