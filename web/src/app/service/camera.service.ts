import { Injectable } from '@angular/core';
import { CoreService } from './core.service';
import { DeviceVendor, IDeviceVendor } from '../config/device-vendor.config';
import { CameraEditorParam } from '../model/camera-editor-param';
import { ArrayHelper } from '../helper/array.helper';

@Injectable()
export class CameraService {
    currentBrandCapability: any; // 從server取回的json格式capability

    constructor(private coreService: CoreService) { }

    /** UI選擇Brand後執行, 取得Capability */
    getBrandCapability(vendor: IDeviceVendor) {
        const data = { fileName: vendor.FileName };
        this.coreService.postConfig({path: this.coreService.urls.URL_BRAND_CAPABILITY, data: data})
            .map(result => this.currentBrandCapability = result)
            .subscribe();
    }

    /** 取得當前Brand底下所有Model型號 */
    getModelList(): string[] {
        const result = [];
        if (!this.currentBrandCapability) {
            return result;
        } else {
            if (Array.isArray(this.currentBrandCapability.Devices.Device)) {
                this.currentBrandCapability.Devices.Device.forEach(element => {
                    result.push(element.Model);
                });
                ArrayHelper.sortString(result);
            } else {
                result.push(this.currentBrandCapability.Devices.Device.Model);
            }
            return result;
        }
    }

    /** 讀取指定model轉為CameraEditorParam物件 */
    getCameraEditorParam(model: string, data: any) {
        if (!this.currentBrandCapability) {
            return;
        }
        return new CameraEditorParam(this.currentBrandCapability, model, data);
    }
}
