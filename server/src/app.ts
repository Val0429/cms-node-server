import { ConfigHelper, ParseDashboardHelper, ParseHelper, ParseServerHelper, ServerHelper, SyncHelper, RouterHelper } from './helpers';
import {DeviceService, CoreService, RestFulService, HouseKeeperService} from './services';



// 初始化順序不可變更

const configHelper = ConfigHelper.instance;
const restFulService = RestFulService.instance;
const serverHelper = ServerHelper.instance;
const parseHelper = ParseHelper.instance;
const parseServerHelper = ParseServerHelper.instance;
const parseDashboardHelper = ParseDashboardHelper.instance;
const syncHelper = SyncHelper.instance;
const routerHelper= RouterHelper.instance;

const coreService = CoreService.instance;
const deviceService=DeviceService.instance;
const houseKeeper = HouseKeeperService.instance;
serverHelper.runServer();