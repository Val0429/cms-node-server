import { Injectable } from '@angular/core';
import { ParseService } from './parse.service';
import { CoreService } from './core.service';
import { Observable } from 'rxjs/Observable';
import { ILicenseStatistics } from 'lib/domain/core';
import { Nvr, Device, RecordSchedule } from 'app/model/core';
import { ArrayHelper } from 'app/helper/array.helper';
import { LicenseProduct } from 'app/config/license-product.config';
import { RestFulService } from './restful.service';

@Injectable()
export class LicenseService {
    /** 各License上限, ex: '00166': 100 */
    licenseLimit: { [key: string]: number } = {};
    constructor(
        private parseService: ParseService,
        private coreService: CoreService,
        private restFulService:RestFulService
    ) {
        //this.getLicenseLimit().subscribe();
    }

    /** 取得目前所有的License並計算未過期的數量
     * 格式: key: ProductNo, value: 數量
     */
    getLicenseLimit() {
        this.licenseLimit = {};
        // 初始化licenseLimit
        LicenseProduct.forEach(type => {
            this.licenseLimit[type.No] = 0;
        });
        return this.coreService.proxyMediaServer({
            method: 'GET',
            path: this.coreService.urls.URL_MEDIA_LICENSE_INFO
        }).map(result => {
            const temp = result.License;
            temp.Adaptor = ArrayHelper.toArray(temp.Adaptor);
            // 分類所有License Key並計算各ProductNo上限總和
            temp.Adaptor.forEach(adp => {
                if (!adp.Key) { return; }
                adp.Key = ArrayHelper.toArray(adp.Key); // 所有已註冊的key
                adp.Key.forEach(key => {
                    if (this.licenseLimit[key.$.ProductNO] === undefined) {
                        console.debug('Cant find this product no.');
                        return;
                    }
                    if (key.$.Expired === '1') {
                        console.debug('Key expired.');
                        return;
                    }

                    this.licenseLimit[key.$.ProductNO] += Number(key.$.Count);
                });
            });
        });
    }

    /** 取得指定license剩餘可用數量 */
    getLicenseAvailableCount(lic: string) {
        if (!lic) {
            alert('No available license type.');
            return Observable.of(0);
        }
        if (lic === 'pass') {
            return Observable.of(Number.MAX_SAFE_INTEGER);
        }
        const get$ = this.getCurrentUsageCountByLicense(lic)
            .map(num => this.licenseLimit[lic] - num);
        return this.getLicenseLimit()
            .switchMap(() => get$);
    }

    /** 取得目前指定license所管理的裝置數量 */
    getCurrentUsageCountByLicense(lic: string) {
        switch (lic) {
            case '00166': return this.getLicenseUsageDevice();
            case '00167': return this.getLicenseUsageThirdNvr();
            case '00168': return this.getLicenseUsageBackendRecord();
            case '00169': return this.getLicenseUsageSmartPatrol();
            case '00170': return this.getLicenseUsageSmartMonitor();
            case '00171': return this.getLicenseUsageIPCamera();
            default: return Observable.of(0);
        }
    }

    /** 取得License 00166 iSapNvr控管的Device當前數量 */
    getLicenseUsageDevice() {
        const getNvr$ = Observable.fromPromise(this.parseService.fetchData({
            type: Nvr,
            filter: query => query
                .matches('Driver', new RegExp('iSAP'), 'i')
                .limit(30000)
        }));
        const getDevice$ = (nvrIds: string[]) => Observable.fromPromise(this.restFulService.getCount({
            type: Device,
            filter: query => query.containedIn('NvrId', nvrIds)
        }));

        return getNvr$
            .switchMap(nvrs => getDevice$(nvrs.map(nvr => nvr.Id)));
    }

    /** 取得License 00167 3rdNvr控管的Device當前數量 */
    getLicenseUsageThirdNvr() {
        const getNvr$ = Observable.fromPromise(this.parseService.fetchData({
            type: Nvr,
            filter: query => query
                .notContainedIn('Driver', ['IPCamera', 'SmartMedia', 'iSAP', 'iSAP Failover Server', 'iSapP2P', 'SmartMedia'])
                .select('Id')
                .limit(30000)
        }));
        const getDevice$ = (nvrIds: string[]) => Observable.fromPromise(this.restFulService.getCount({
            type: Device,
            filter: query => query.containedIn('NvrId', nvrIds)
        }));

        return getNvr$
            .switchMap(nvrs => getDevice$(nvrs.map(nvr => nvr.Id)));
    }

    /** 取得License 00168 BackendRecord控管的RecordSchedule數量 */
    getLicenseUsageBackendRecord() {
        const get$ = Observable.fromPromise(this.restFulService.getCount({
            type: RecordSchedule            
        }));
        return get$;
    }

    /** 取得License 00169 SmartPatrol控管的Device數量 */
    getLicenseUsageSmartPatrol() {
        const get$ = Observable.fromPromise(this.restFulService.getCount({
            type: Device,
            filter: query => query
                .equalTo('Config.Brand', 'iSapSolution')
                .equalTo('Config.Model', 'Smart Patrol Service')                
        }));
        return get$;
    }

    /** 取得License 00170 SmartMonitor控管的Device數量 */
    getLicenseUsageSmartMonitor() {
        const get$ = Observable.fromPromise(this.restFulService.getCount({
            type: Device,
            filter: query => query
                .equalTo('Config.Brand', 'iSapSolution')
                .equalTo('Config.Model', 'Smart Monitor Service')                
        }));
        return get$;
    }

    /** 取得License 00171 IPCamera控管的Device數量 */
    getLicenseUsageIPCamera() {
        const getNvr$ = Observable.fromPromise(this.parseService.getData({
            type: Nvr,
            filter: query => query.equalTo('Driver', 'IPCamera')
        }));

        const getDevice$ = (nvrId: string) => Observable.fromPromise(this.restFulService.getCount({
            type: Device,
            filter: query => query.equalTo('NvrId', nvrId)
        }));

        return getNvr$
            .switchMap(nvr => getDevice$(nvr.Id));
    }

    /** Nvr Editor儲存時判斷license */
    getNvrManufacturerLicenseCode(manufacturer: string) {
        const isapList = ['iSAP', 'iSAP Failover Server', 'iSapP2P', 'SmartMedia'];
        return isapList.indexOf(manufacturer) >= 0
            ? '00166' : '00167';
    }
}

/** MediaServer回傳的LicenseInfo */
export interface ILicenseInfo {
    Adaptor: ILicenseAdaptor[];
    Maximun: string;
}

export interface ILicenseAdaptor {
    Description: string;
    IP: string;
    MAC: string;
    Key: {
        $: {
            Brand: string;
            Count: string;
            ProductNO: string;
            RegisterDate: string;
            ExpireDate?: string;
            Expired?: string;
            Trial: string;
            val: string;
        }
    }[];
}

export interface ILicenseStatistics {
    ProductNo: string; // License ProductNo
    ProductType: string; // License名稱
    Description: string[]; // License說明
    License: {
        LicenseKey: string;
        MAC: string;
        LicenseCount: number;
        Trial: boolean;
        RegisterDate: string;
        ExpireDate: string;
        Expired: boolean;
    }[];
    LicenseCount: number;
    UsageCount: number;
}
