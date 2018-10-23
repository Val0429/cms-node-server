import { ConfigHelper, ServerHelper } from '.';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as path from 'path';
import { ParseRoute } from '../route';

export class RouterHelper {

    routeMaps: IRouteMap[] = [
        ParseRoute,
        // WebRoute
    ];

    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: RouterHelper;

    private serverHelper = ServerHelper.instance;

    private pathConfig = ConfigHelper.instance.pathConfig;

    private get app() {
        return this.serverHelper.app;
    }

    constructor() {
        this.loadRoute();
    }

    loadRoute() {
        this.routeMaps.forEach(routeMap =>
            this.app.use(`/${routeMap.path}`, this.recursiveLoadRoute(routeMap)));

        // 以下未來再整合
        const webPath = '../../../web/dist';
        this.app.use('/cms-setup', express.static(path.join(__dirname, webPath), { redirect: false }));
        this.app.get('*', (req, res) => res.sendFile(path.join(__dirname, webPath, '/index.html')));
        this.app.get('/', (req, res) => res.redirect('/cms-setup'));
    }

    recursiveLoadRoute(routeMap: IRouteMap) {
        if (!Array.isArray(routeMap.children) || routeMap.children.length < 1) {
            return routeMap.router;
        }

        routeMap.children.forEach(_routeMap =>
            routeMap.router.use(`/${_routeMap.path}`, this.recursiveLoadRoute(_routeMap)));

        return routeMap.router;
    };
}

export interface IRouteMap {
    path: string;
    router?: express.Router;
    children?: IRouteMap[];
}