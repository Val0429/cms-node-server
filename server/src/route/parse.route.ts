// import * as bodyParser from 'body-parser';
import { Router } from 'express';
import * as bodyParser from 'body-parser';
import { IRouteMap } from '../helpers';
import { CmsRoute } from './cms.route';
import { ProxyRoute } from './proxy.route';

export const ParseRoute: IRouteMap = {
    path: 'parse',
    router: Router().use(bodyParser.json())
        .get('/test', (req, res) => { res.send('GO Test') }),
    children: [
        CmsRoute,
        ProxyRoute
    ]
}
