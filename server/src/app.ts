import { ConfigHelper, ParseDashboardHelper, ParseHelper, ParseServerHelper, ServerHelper, SyncHelper, RouterHelper } from './helpers';

// 初始化順序不可變更
const configHelper = ConfigHelper.instance;
const serverHelper = ServerHelper.instance;
const parseHelper = ParseHelper.instance;
const parseServerHelper = ParseServerHelper.instance;
const parseDashboardHelper = ParseDashboardHelper.instance;
const syncHelper = SyncHelper.instance;
const routerHelper= RouterHelper.instance;

serverHelper.runServer();