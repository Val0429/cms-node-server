import { ArrayHelper } from 'app/helper/array.helper';
import { StringHelper } from 'app/helper/string.helper';
import { NumberHelper } from 'app/helper/number.helper';
import { JsonHelper } from 'app/helper/json.helper';
import {
    AspectRatioCorrectionModelType, DewarpTypeModelType, SeamlessEdgeRecordingBrand,
    ProfileModes, QuadSpecialModel, OccupancyPriorityList, ResolutionModeBrand,
    BitrateControlBrand, MotionThresholdBrand, ResolutionRegionBrand, QualityBrand
} from 'app/config/device-vendor.config';
import { Device } from 'app/model/core';
import { IDeviceStream } from 'lib/domain/core';
import { StreamProfileParamV2 } from 'app/model/stream-profile-paramV2';

export class CameraEditorParam {
    jsonHelper = JsonHelper.instance;
    /** Camera型號Capability */
    modelCap: any;
    /** 將儲存於DB的device資料 */
    currentCameraConfig: Device;
    /** ModelCap.Type, 記錄此model device的種類 */
    TypeOptions: string[];
    /** LiveStream等題目使用的 Video Stream Profile選單 */
    ModeList: { key: string, value: string }[];
    /** 是否出現AspectRatioCorrection */
    AspectRatioCorrection: boolean;
    /** Brand: Acti有部分model出現此選項 */
    AspectRatioOptions: string[];
    /** TVStandard選單 */
    TVStandardOptions: string[];
    /** Stream的Protocol選單 */
    ProtocolOptions: string[];
    /** Stream的ResolutionMode選單, brand: ArecontVision */
    ResolutionModeOptions: string[];
    /** Model.Cap內不受stream影響(放在外層)的Compression選項 */
    CompressionOptions: string[];
    /** Stream Quality選項, brand: Bosch */
    QualityOptions: string[];
    /** StreamProfileMode選項, brand: Bosch */
    StreamProfileModeOptions: { key: string, value: string }[];
    /** Model.Cap內不受stream影響(放在外層)的PowerFrequency選項 */
    PowerFrequencyOptions: any[];
    StreamProfileList: { key: string, value: string }[]; // StreamProfile選單 for LiveStream, RecordString
    /** 動態Stream選單的參考資料物件 */
    StreamProfileParams: StreamProfileParamV2[];
    /** 各Stream當前條件下匹配的動態選單內容 */
    StreamCurrentMatchParam: { id: number, param: StreamProfileParamV2 }[];
    SensorModeOptions: string[];
    DewarpTypeOptions: string[];
    MountTypeOptions: string[];
    SeamlessEdgeRecording: boolean; // 表示此checkbox欄位是否出現, 與value無關
    ChannelIdOptions: string[]; // 可選擇的ChannelId
    IOPortConfigurable: boolean; // allow modify IOPort
    IOPortOptions?: string[]; // IO Port setting option
    IOPortCount: number;
    PanSupport: string;
    TiltSupport: string;
    ZoomSupport: string;
    FocusSupport: string;
    OccupancyPriorityOptions: { key: string, value: string }[];
    BitrateControlOptions: string[];
    /** MotionThreshold選單, brand: ArecontVision */
    MotionThresholdOptions: string[];
    /** 讓layout判斷此廠牌是否需在Stream設定中設定Resolution Region */
    ResolutionRegionConfig: boolean;

    constructor(cap: any, model: string, data: Device) {
        if (Array.isArray(cap.Devices.Device)) {
            this.modelCap = cap.Devices.Device.find(x => x.Model === model);
        } else {
            this.modelCap = cap.Devices.Device;
        }
        this.currentCameraConfig = data;
        this.currentCameraConfig.Config.Name = this.modelCap.Manufacture + ' ' + this.modelCap.Model; // copy name of brand and model

        this.initModelParam();
        this.findReferenceModelCap(cap);
        this.buildConstantProperty(); // first step
        this.setDefaultValue(); // second step
        this.getDynamicOptions(); // third step
        this.setPTZCommands();
    }

    /** 遞迴找出參考的Model */
    findReferenceModelCap(cap: any) {
        this.setModelParam(); // 尋找關聯Model前先將當前Model參數記下
        if (this.jsonHelper.hasAttribute(this.modelCap, 'SameAs')) {
            this.modelCap = cap.Devices.Device.find(x => x.Model === this.modelCap.SameAs);
            this.findReferenceModelCap(cap);
        }
    }

    /** 參考XML取得所有選項參數 */
    buildConstantProperty() {
        if (!this.modelCap) {
            return;
        }

        // Get type options
        this.TypeOptions = ArrayHelper.split(this.modelCap.Type, ',');
        // AspectRatioCorrection / DewarpType
        this.DewarpTypeOptions = []; // init
        this.TypeOptions.forEach(type => {
            // Check if model type is on list, display AspectRatioCorrection column
            if (AspectRatioCorrectionModelType.indexOf(type.toLowerCase()) >= 0) {
                this.AspectRatioCorrection = true;
            }
            // Check if model type is on list, display Dewarp Type column
            if (DewarpTypeModelType.indexOf(type.toLowerCase()) >= 0) {
                this.DewarpTypeOptions = ['Off', 'A0**V', 'A8TRT', 'A1UST'];
            }
        });

        this.AspectRatioOptions = [];

        // Mode List
        this.ModeList = this.getModeOptions();

        // Get TV Standard Options
        this.TVStandardOptions = [];
        if (this.jsonHelper.hasAttribute(this.modelCap, 'TVStandard')) {
            const tvStandardArray = ArrayHelper.toArray(this.modelCap.TVStandard);
            tvStandardArray.forEach(element => {
                const options = element.$.value.split(',');
                options.forEach(opt => {
                    this.TVStandardOptions.push(opt);
                });
            });
        }
        // TVStandard is special case need to set default value here
        if (this.TVStandardOptions.length > 0) {
            const item = this.TVStandardOptions.find(x => x === this.currentCameraConfig.CameraSetting.TVStandard);
            if (!item || this.TVStandardOptions.length === 1) {
                this.currentCameraConfig.CameraSetting.TVStandard = this.TVStandardOptions[0];
            }
        } else {
            this.currentCameraConfig.CameraSetting.TVStandard = '';
        }

        // Get Protocol Options
        this.ProtocolOptions = [];
        if (this.jsonHelper.hasAttribute(this.modelCap, 'ConnectionProtocol')) {
            String(this.modelCap.ConnectionProtocol).split(',').forEach(element => {
                switch (element.toLowerCase()) {
                    case 'rtsp':
                        this.ProtocolOptions.push('RTSP');
                        break;
                    case 'rtsp over udp':
                        this.ProtocolOptions.push('RTSP');
                        break;
                    case 'rtsp over tcp':
                        this.ProtocolOptions.push('RTSP / TCP');
                        break;
                    case 'rtsp over http':
                        this.ProtocolOptions.push('RTSP / HTTP');
                        break;
                    case 'rtsp over https':
                        this.ProtocolOptions.push('RTSP / HTTPS');
                        break;
                    default:
                        // this.ProtocolOptions.push(element); // bug單8835, 只支援RTSP
                        break;
                }
            });
        }
        let modelCapManufacture = Array.isArray(this.modelCap.Manufacture) ? this.modelCap.Manufacture[0].toLowerCase() : this.modelCap.Manufacture.toLowerCase();
        // copy Series to CameraSetting
        if (this.jsonHelper.hasAttribute(this.modelCap, 'Series')) {
            this.currentCameraConfig.CameraSetting.Series = this.modelCap.Series;
        } else {
            delete this.currentCameraConfig.CameraSetting.Series;
        }

        // 檢查廠牌判斷是否需選擇Resolution Mode
        this.ResolutionModeOptions = ['FULL'];
        if (ResolutionModeBrand.indexOf(modelCapManufacture) >= 0) {
            this.ResolutionModeOptions.push('HALF');
        }

        // Get 外層Compression Options
        this.CompressionOptions = [];
        if (this.jsonHelper.hasAttribute(this.modelCap, 'Compression')) {
            this.CompressionOptions = String(this.modelCap.Compression).split(',');
        }

        this.QualityOptions = [];
        if (QualityBrand.indexOf(modelCapManufacture) >= 0) {
            for (let i = 1; i < 11; i++) {
                this.QualityOptions.push((i * 10).toString());
            }
        }

        this.StreamProfileModeOptions = [];
        const spm = this.jsonHelper.findAttributeByString(this.modelCap, 'StreamProfileModes');
        if (spm) {
            const spms = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(spm, 'StreamProfileMode'));
            spms.forEach(mode => {
                const keyNode = this.jsonHelper.findAttributeByString(mode, '_');
                const valueNode = this.jsonHelper.findAttributeByString(mode, '$.id');
                if (keyNode && valueNode) {
                    this.StreamProfileModeOptions.push({ key: keyNode, value: valueNode });
                }
            });
        }

        // Get SensorMode Options
        this.SensorModeOptions = [];
        if (this.jsonHelper.hasAttribute(this.modelCap, 'SensorMode')) {
            const sensorModeArray = ArrayHelper.toArray(this.modelCap.SensorMode);
            sensorModeArray.forEach(element => {
                if (this.jsonHelper.hasAttribute(element.$, 'value')) {
                    if (element.$.value.indexOf(',') >= 0) {
                        const values = element.$.value.split(',');
                        values.forEach(v => {
                            this.SensorModeOptions.push(v);
                        });
                    } else {
                        this.SensorModeOptions.push(element.$.value);
                    }
                }
                if ((typeof element) === 'string') {
                    const values = element.split(',');
                    values.forEach(v => {
                        this.SensorModeOptions.push(v);
                    });
                }
            });
        }

        // show this column if the model manufacture is on list
        this.SeamlessEdgeRecording = SeamlessEdgeRecordingBrand.indexOf(modelCapManufacture) >= 0;

        this.ChannelIdOptions = [];
        if (this.jsonHelper.hasAttribute(this.modelCap, 'NumberOfChannel')) {
            const numberOfChannel = Number(this.modelCap.NumberOfChannel);
            for (let i = 1; i <= numberOfChannel; i++) {
                this.ChannelIdOptions.push(i.toString());
            }
        }

        if (this.jsonHelper.hasAttribute(this.modelCap, 'IOPort')) {
            this.IOPortConfigurable = this.modelCap.IOPort.$.configurable === 'true';
            this.IOPortOptions = ArrayHelper.split(this.modelCap.IOPort.$.setting, ',');
            if (this.jsonHelper.hasAttribute(this.modelCap.IOPort, 'Port')) {
                if (Array.isArray(this.modelCap.IOPort.Port)) {
                    this.IOPortCount = this.modelCap.IOPort.Port.length;
                } else {
                    this.IOPortCount = 1;
                }
            } else {
                this.IOPortCount = 0;
            }
        }

        this.OccupancyPriorityOptions = [];
        const model = this.modelCap.Model.toLowerCase();
        if (modelCapManufacture === 'isapsolution'
            && (model === 'smart patrol service' || model === 'smart monitor service')) {
            this.OccupancyPriorityOptions = OccupancyPriorityList;
        }

        // 檢查廠牌是否需選擇Bitrate Control
        this.BitrateControlOptions = [];
        if (BitrateControlBrand.indexOf(modelCapManufacture) >= 0) {
            this.BitrateControlOptions.push('VBR');
            this.BitrateControlOptions.push('CBR');
        }

        // 檢查廠牌判斷是否需選擇Resolution Mode
        this.MotionThresholdOptions = [];
        if (MotionThresholdBrand.indexOf(modelCapManufacture) >= 0) {
            for (let i = 0; i < 11; i++) {
                this.MotionThresholdOptions.push((i * 10).toString());
            }
        }

        // 檢查廠牌判斷是否應設定Resolution Region
        this.ResolutionRegionConfig = ResolutionRegionBrand.indexOf(modelCapManufacture) >= 0;
    }

    /** 將單純看ModelCap非動態的選項設定預設值到currentCameraConfig */
    setDefaultValue() {
        if (!this.modelCap) {
            return;
        }
        let modelCapManufacture = Array.isArray(this.modelCap.Manufacture) ? this.modelCap.Manufacture[0].toLowerCase() : this.modelCap.Manufacture.toLowerCase();
        // 廠牌isap不需要紀錄IPAddress和Http
        if (modelCapManufacture === 'isapsolution') {
            this.currentCameraConfig.Config.IPAddress = '';
            this.currentCameraConfig.Config.Http = 0;
        }

        // 若不開放此欄位勾選, 資料就預設為false
        if (this.AspectRatioCorrection === false) {
            this.currentCameraConfig.CameraSetting.AspectRatioCorrection = 'false';
        }

        // Type
        if (this.TypeOptions.length > 0 && this.TypeOptions.indexOf(this.currentCameraConfig.Capability.Type) < 0) {
            this.currentCameraConfig.Capability.Type = this.TypeOptions[0];
        } else if (this.TypeOptions.length === 0) {
            this.currentCameraConfig.Capability.Type = '';
        }

        // Mode
        if (this.ModeList.length > 0) {
            const item = this.ModeList.find(x => x.value === String(this.currentCameraConfig.CameraSetting.Mode));
            if (!item || this.ModeList.length === 1) {
                this.currentCameraConfig.CameraSetting.Mode = Number(this.ModeList[0].value);
            }
        } else {
            this.currentCameraConfig.CameraSetting.Mode = 0;
        }

        if (this.DewarpTypeOptions.length > 0) {
            const item = this.DewarpTypeOptions.find(x => x === this.currentCameraConfig.CameraSetting.DewarpType);
            if (!item || this.DewarpTypeOptions.length === 1) {
                this.currentCameraConfig.CameraSetting.DewarpType = this.DewarpTypeOptions[0];
            }
        } else {
            this.currentCameraConfig.CameraSetting.DewarpType = '';
        }

        // Seamless Edge Recording
        if (this.SeamlessEdgeRecording !== true ) {
            this.currentCameraConfig.CameraSetting.SeamlessEdgeRecording = false;
        }

        // Produce correct quantity of IOPort   
        console.debug("this.currentCameraConfig.CameraSetting.IOPort", this.currentCameraConfig.CameraSetting.IOPort, "this.IOPortCount", this.IOPortCount );
        if(!this.IOPortCount || this.IOPortCount == 0){
            this.currentCameraConfig.CameraSetting.IOPort = [];
        }else if (this.IOPortCount > 0 && (!this.currentCameraConfig.CameraSetting.IOPort || this.currentCameraConfig.CameraSetting.IOPort.length != this.IOPortCount)) {
            const tempIOPort = [];
            for (let i = 1; i <= this.IOPortCount; i++) {
                const item = this.currentCameraConfig.CameraSetting.IOPort.find(x => x.Id === i.toString());
                if (item) {
                    tempIOPort.push(item);
                } else {
                    tempIOPort.push({ Id: i.toString(), Mode: this.IOPortOptions[0] });
                }
            }
            this.currentCameraConfig.CameraSetting.IOPort = tempIOPort;
        }

        if (this.OccupancyPriorityOptions.length > 0) {
            if (!this.OccupancyPriorityOptions.some(x =>
                Number(x.value) === this.currentCameraConfig.Config.Authentication.OccupancyPriority)) {
                this.currentCameraConfig.Config.Authentication.OccupancyPriority = Number(this.OccupancyPriorityOptions[0].value);
            }
        } else {
            this.currentCameraConfig.Config.Authentication.OccupancyPriority = 0;
        }

        // 若廠牌沒有相關選項就移除config中的資料
        this.currentCameraConfig.Config.Stream.forEach(str => {
            if (this.BitrateControlOptions.length === 0) {
                delete str.Video.BitrateControl;
            }
            if (this.MotionThresholdOptions.length === 0) {
                delete str.Video.MotionThreshold;
            }
            if (this.StreamProfileModeOptions.length === 0) {
                delete str.ProfileMode;
            }
            if (this.BitrateControlOptions.length === 0) {
                delete str.Video.BitrateControl;
            }
            if (this.QualityOptions.length === 0) {
                delete str.Video.Quality;
            }
            if (this.MotionThresholdOptions.length === 0) {
                delete str.Video.MotionThreshold;
            }
            if (!this.ResolutionRegionConfig) {
                delete str.Video.RegionStartPointX;
                delete str.Video.RegionStartPointY;
            }
        });
    }

    /** 初始化Model參數 (NumberOf/PTZ/Focus support) */
    initModelParam() {
        // NumberOf something
        const numberOfSeriesJson = ['NumberOfChannel', 'NumberOfAudioIn', 'NumberOfAudioOut', 'NumberOfDi', 'NumberOfDo', 'NumberOfMotion'];
        for (let i = 0; i < numberOfSeriesJson.length; i++) {
            this.currentCameraConfig.Capability[numberOfSeriesJson[i]] = 0;
        }

        // PTZ / FocusSupport
        this.currentCameraConfig.Config.PTZSupport.Pan = 'false';
        this.currentCameraConfig.Config.PTZSupport.Tilt = 'false';
        this.currentCameraConfig.Config.PTZSupport.Zoom = 'false';
        this.currentCameraConfig.Capability.FocusSupport = 'false';
    }

    /** 設定Model參數，若該參數非0或false則不允許更動 */
    setModelParam() {
        // 複製NumberOf系列的資料到currentConfig, 因Cap XML的DI/DO是大寫, Parse Device的Di/Do是小寫, 故以此方式複製欄位
        const numberOfSeriesXml = ['NumberOfChannel', 'NumberOfAudioIn', 'NumberOfAudioOut', 'NumberOfDI', 'NumberOfDO', 'NumberOfMotion'];
        const numberOfSeriesJson = ['NumberOfChannel', 'NumberOfAudioIn', 'NumberOfAudioOut', 'NumberOfDi', 'NumberOfDo', 'NumberOfMotion'];
        for (let i = 0; i < numberOfSeriesXml.length; i++) {
            if (this.currentCameraConfig.Capability[numberOfSeriesJson[i]] === 0) {
                this.currentCameraConfig.Capability[numberOfSeriesJson[i]] =
                    this.jsonHelper.hasAttribute(this.modelCap, numberOfSeriesXml[i])
                        ? Number(this.modelCap[numberOfSeriesXml[i]]) : 0;
            }
        }

        // PTZ / FocusSupport
        const ptzTarget = ['Pan', 'Tilt', 'Zoom'];
        const ptzSource = ['PanSupport', 'TiltSupport', 'ZoomSupport'];
        for (let i = 0; i < ptzTarget.length; i++) {
            if (this.currentCameraConfig.Config.PTZSupport[ptzTarget[i]] === 'false') {
                this.currentCameraConfig.Config.PTZSupport[ptzTarget[i]] = this.jsonHelper.hasAttribute(this.modelCap, ptzSource[i])
                    ? this.modelCap[ptzSource[i]] : 'false';
            }
        }
        if (this.currentCameraConfig.Capability.FocusSupport === 'false') {
            this.currentCameraConfig.Capability.FocusSupport = this.jsonHelper.hasAttribute(this.modelCap, 'FocusSupport')
                ? this.modelCap.FocusSupport : 'false';
        }
    }

    /** 依照目前Brand取得預設RTSP Port */
    getDefaultRTSPPort() {
        switch (this.currentCameraConfig.Config.Brand) {
            case 'ACTi': return 7070;
            default: return 554;
        }
    }

    /** 動態產生選項, 並視情況從動態選項中設定預設值到CurrentCameraConfig */
    getDynamicOptions() {
        this.MountTypeOptions = this.getMountTypeOptions();
        this.PowerFrequencyOptions = this.getPowerFrequencyOptions();
        this.AspectRatioOptions = this.getAspectRatioOptions();
        this.StreamProfileList = this.getStreamOptions();
        this.StreamProfileParams = this.getStreamProfileParam(); // 必須放在最後
        // console.debug(this.StreamProfileParams);

        // 在config中產生正確數量的Stream物件
        const tempStream = [];
        const defaultRTSPPort = this.getDefaultRTSPPort();
        for (let i = 1; i <= this.StreamProfileList.length; i++) {
            const item = this.currentCameraConfig.Config.Stream.find(x => x.Id === i);
            if (item) {
                tempStream.push(item);
            } else {
                // 沒有Stream就產生預設值
                const newItem: IDeviceStream = {
                    Id: i,
                    Video: {
                        ResolutionScale: 'FULL',
                        Encode: '',
                        Width: 0,
                        Height: 0,
                        Fps: 10,
                        Bitrate: 64,
                        ChannelId: Number(this.ChannelIdOptions[0])
                    },
                    Port: {}
                };
                newItem.Port.RTSP = defaultRTSPPort;
                tempStream.push(newItem);
            }
        }
        this.currentCameraConfig.Config.Stream = tempStream;

        // Stream Attributes
        this.currentCameraConfig.Config.Stream.forEach(str => {
            // Check each stream's channelId is available
            if (this.ChannelIdOptions.length > 0 && this.ChannelIdOptions.indexOf(String(str.Video.ChannelId)) < 0) {
                str.Video.ChannelId = Number(this.ChannelIdOptions[0]);
            } else if (this.ChannelIdOptions.length === 0) {
                str.Video.ChannelId = 0;
            }

            if (this.CompressionOptions.length > 0 && this.CompressionOptions.indexOf(str.Video.Encode) < 0) {
                str.Video.Encode = this.CompressionOptions[0];
            }
            // else if (this.CompressionOptions.length === 0) {
            //     str.Video.Encode = '';
            // }

            // Resolution Mode default value
            if (this.ResolutionModeOptions.length > 0) {
                if (this.ResolutionModeOptions.indexOf(str.Video.ResolutionScale) < 0) {
                    str.Video.ResolutionScale = this.ResolutionModeOptions[0];
                }
            } else if (this.ResolutionModeOptions.length === 0) {
                str.Video.ResolutionScale = '';
            }

            if (this.ResolutionModeOptions.indexOf(str.Video.ResolutionScale) < 0) {
                str.Video.ResolutionScale = this.ResolutionModeOptions[0];
            }

            if (this.ProtocolOptions.length > 0) {
                if (this.ProtocolOptions.indexOf(str.Video.Protocol) < 0) {
                    str.Video.Protocol = this.ProtocolOptions[0];
                }
            } else {
                str.Video.Protocol = '';
            }

            if (this.StreamProfileModeOptions.length > 0 &&
                !this.StreamProfileModeOptions.some(x => x.value === String(str.ProfileMode))) {
                str.ProfileMode = Number(this.StreamProfileModeOptions[0].value);
            }

            if (this.BitrateControlOptions.length > 0 && !this.BitrateControlOptions.some(x => x === str.Video.BitrateControl)) {
                str.Video.BitrateControl = this.BitrateControlOptions[0];
            }

            if (this.MotionThresholdOptions.length > 0 && this.MotionThresholdOptions.indexOf(String(str.Video.MotionThreshold)) < 0) {
                str.Video.MotionThreshold = Number(this.MotionThresholdOptions[0]);
            }

            if (this.QualityOptions.length > 0 && !this.QualityOptions.some(x => x === String(str.Video.Quality))) {
                str.Video.Quality = Number(this.QualityOptions[0]);
            }

            str.Video.Resolution = `${str.Video.Width}x${str.Video.Height}`;
        });

        // 以下為可能受到ModelCap影響選單的題目
        if (this.MountTypeOptions.length > 0) {
            if (!this.MountTypeOptions.some(x => x === this.currentCameraConfig.CameraSetting.MountType)) {
                this.currentCameraConfig.CameraSetting.MountType = this.MountTypeOptions[0];
            }
        } else {
            this.currentCameraConfig.CameraSetting.MountType = '';
        }

        if (this.AspectRatioOptions.length > 0) {
            if (!this.AspectRatioOptions.some(x => x === this.currentCameraConfig.CameraSetting.AspectRatio)) {
                this.currentCameraConfig.CameraSetting.AspectRatio = this.AspectRatioOptions[0];
            }
        } else {
            this.currentCameraConfig.CameraSetting.AspectRatio = '';
        }

        if (this.StreamProfileList.length > 0) {
            const item1 = this.StreamProfileList.find(x => Number(x.value) === this.currentCameraConfig.CameraSetting.LiveStream);
            if (!item1 || this.StreamProfileList.length === 1) {
                this.currentCameraConfig.CameraSetting.LiveStream = Number(this.StreamProfileList[0].value);
            }
            const item2 = this.StreamProfileList.find(x => Number(x.value) === this.currentCameraConfig.CameraSetting.RecordStream);
            if (!item2 || this.StreamProfileList.length === 1) {
                this.currentCameraConfig.CameraSetting.RecordStream = Number(this.StreamProfileList[0].value);
            }
        } else {
            this.currentCameraConfig.CameraSetting.LiveStream = 0;
            this.currentCameraConfig.CameraSetting.RecordStream = 0;
        }

        // SensorMode選項可能受到StreamParam影響，故此處再檢查一次
        if (this.SensorModeOptions.length > 0) {
            if (!this.SensorModeOptions.some(x => x === this.currentCameraConfig.CameraSetting.SensorMode)) {
                this.currentCameraConfig.CameraSetting.SensorMode = this.SensorModeOptions[0];
            }
        } else {
            this.currentCameraConfig.CameraSetting.SensorMode = '';
        }

        // PowerFrequency選項可能受到StreamParam影響，故此處再檢查一次
        if (this.PowerFrequencyOptions.length > 0
            && !this.PowerFrequencyOptions.some(x => x.value === String(this.currentCameraConfig.CameraSetting.PowerFrequency))) {
            this.currentCameraConfig.CameraSetting.PowerFrequency = Number(this.PowerFrequencyOptions[0].value);
        } else if (this.PowerFrequencyOptions.length === 0) {
            this.currentCameraConfig.CameraSetting.PowerFrequency = 0;
        }
    }

    // 建構Customization(RTSP)專用欄位, 因PTZCommands非單純string, 故另外建立
    setPTZCommands() {
        let modelCapManufacture = Array.isArray(this.modelCap.Manufacture) ? this.modelCap.Manufacture[0].toLowerCase() : this.modelCap.Manufacture.toLowerCase();
        const isCustom = modelCapManufacture === 'customization';
        if (isCustom) {
            this.currentCameraConfig.CameraSetting.PTZCommands = new PTZCommands(this.currentCameraConfig);
        } else if (!isCustom) {
            delete this.currentCameraConfig.CameraSetting.PTZCommands;
        }
    }

    /** 取得當前狀況下每個stream profile應套用的param */
    getCurrentStreamParam() {
        this.StreamCurrentMatchParam = [];
        if (!this.StreamProfileParams) {
            return;
        }
        this.currentCameraConfig.Config.Stream.forEach(stream => {
            this.StreamCurrentMatchParam.push({
                id: stream.Id,
                param: this.findStreamProfileParam(stream, this.StreamProfileParams)
            });
        });
        // console.debug(this.StreamCurrentMatchParam);
    }

    /** Stream以外的儲存值如DewarpMode等，將影響可選用的StreamParam，透過遞迴尋找符合特定stream目前狀況的param */
    findStreamProfileParam(stream: IDeviceStream, param: StreamProfileParamV2[], preStreamId?: number) {
        if (param === undefined) {
            return undefined;
        }
        // 先檢查條件
        let query = param;
        if (!StringHelper.isNullOrEmpty(stream.Video.DewarpMode)) {
            query = query.filter(x => x.DewarpMode === stream.Video.DewarpMode || x.DewarpMode === '');
        }
        if (preStreamId) {
            const preStreamProfile = this.currentCameraConfig.Config.Stream.find(x => x.Id === preStreamId);
            // 過濾preStream的compression
            if (!StringHelper.isNullOrEmpty(preStreamProfile.Video.Encode)) {
                const hasValuePart = query.filter(x => x.PreStreamCompression.some(comp => comp === preStreamProfile.Video.Encode));
                query = hasValuePart.length > 0
                    ? hasValuePart
                    : query.filter(x => x.PreStreamCompression.length === 0);
            }
            // 過濾preStream的resolution
            if (!StringHelper.isNullOrEmpty(preStreamProfile.Video.Resolution)) {
                const hasValuePart = query.filter(x => x.PreStreamResolution.some(res => res === preStreamProfile.Video.Resolution));
                query = hasValuePart.length > 0
                    ? hasValuePart
                    : query.filter(x => x.PreStreamResolution.length === 0);
            }
            // 過濾preStream的fps
            if (preStreamProfile.Video.Fps !== 0) {
                const hasValuePart = query.filter(x => x.PreStreamFps.some(fps => fps === String(preStreamProfile.Video.Fps)));
                query = hasValuePart.length > 0
                    ? hasValuePart
                    : query.filter(x => x.PreStreamFps.length === 0);
            }
        }
        if (!StringHelper.isNullOrEmpty(this.currentCameraConfig.CameraSetting.MountType)) {
            query = query.filter(x => x.Mounttype.indexOf(this.currentCameraConfig.CameraSetting.MountType) >= 0
                || x.Mounttype.length === 0);
        }
        if (this.currentCameraConfig.CameraSetting.PowerFrequency !== 0) {
            query = query.filter(x => x.PowerFrequency.some(pf => pf === String(this.currentCameraConfig.CameraSetting.PowerFrequency))
                || x.PowerFrequency.length === 0
                || x.PowerFrequency.indexOf('') > -1);
        }
        if (!StringHelper.isNullOrEmpty(this.currentCameraConfig.CameraSetting.AspectRatio)) {
            query = query.filter(x => x.AspectRatio.some(ap => ap === this.currentCameraConfig.CameraSetting.AspectRatio)
                || x.AspectRatio.length === 0);
        }
        // 從滿足條件的Id中找到目標
        const target = query.find(x => x.Id === stream.Id);
        if (target !== undefined) {
            return target;
        } else if (query.length > 0) { // 沒找到對應id目標，但仍有其他資料，就從這些資料中找child
            let result: StreamProfileParamV2;
            query.forEach(element => {
                if (result === undefined) {
                    const item = this.findStreamProfileParam(stream, element.Child, element.Id);
                    if (item !== undefined) {
                        result = item;
                    }
                }
            });
            return result;
        } else {
            return undefined;
        }
    }

    // 從當前狀態中的Id, param match表找出param資料
    getCurrnentStreamProfileParamById(id: number) {
        const item = this.StreamCurrentMatchParam.find(x => x.id === id);
        if (item && item.param) {
            return item.param;
        } else {
            return undefined;
        }
    }

    /** 由layout觸發，取得參數StreamId的Compression選項 */
    getCompressionOptionsByStreamId(id: number) {
        const param = this.getCurrnentStreamProfileParamById(id);
        if (!param || param.CompressionOptions === undefined || param.CompressionOptions.length === 0) {
            return [];
        }
        const streamProfile = this.currentCameraConfig.Config.Stream.find(x => x.Id === id);
        let query = param.CompressionOptions;
        if (!StringHelper.isNullOrEmpty(this.currentCameraConfig.CameraSetting.SensorMode)) {
            query = query.filter(x => x.SensorMode.some(ss => ss === this.currentCameraConfig.CameraSetting.SensorMode)
                || x.SensorMode.length === 0);
        }
        if (query.length > 0) { // 有至少一筆符合的Compression選項
            if (query[0].Options.indexOf(streamProfile.Video.Encode) < 0) {
                streamProfile.Video.Encode = query[0].Options[0];
                this.getCurrentStreamParam(); // 若有改值就重新找當前套用的StreamParam
            }
            return query[0].Options;
        } else {
            streamProfile.Video.Encode = '';
            return [];
        }
    }

    getResolutionOptionsByStreamId(id: number) {
        const param = this.getCurrnentStreamProfileParamById(id);
        if (!param || param.ResolutionOptions === undefined || param.ResolutionOptions.length === 0) {
            return [];
        }
        const streamProfile = this.currentCameraConfig.Config.Stream.find(x => x.Id === id);
        let query = param.ResolutionOptions;
        if (!StringHelper.isNullOrEmpty(streamProfile.Video.Encode)) {
            query = query.filter(x => x.Compression.some(comp => comp === streamProfile.Video.Encode) || x.Compression.length === 0);
        }
        if (this.currentCameraConfig.CameraSetting.PowerFrequency !== 0) {
            query = query.filter(x => x.PowerFrequency.some(pf => pf === String(this.currentCameraConfig.CameraSetting.PowerFrequency))
                || x.PowerFrequency.length === 0
                || x.PowerFrequency.indexOf('') > -1);
        }
        if (!StringHelper.isNullOrEmpty(this.currentCameraConfig.CameraSetting.AspectRatio)) {
            query = query.filter(x => x.AspectRatio.some(asp => asp === this.currentCameraConfig.CameraSetting.AspectRatio)
                || x.AspectRatio.length === 0);
        }

        const arc = this.currentCameraConfig.CameraSetting.AspectRatioCorrection ? 'true' : 'false';
        query = query.filter(x => x.AspectRatioCorrection === arc);

        if (!StringHelper.isNullOrEmpty(this.currentCameraConfig.CameraSetting.SensorMode) && query.some(x => x.SensorMode.length > 0)) {
            query = query.filter(x => x.SensorMode.some(ss => ss === this.currentCameraConfig.CameraSetting.SensorMode)
                || x.SensorMode === []);
        }
        if (query.length > 0) {
            if (query[0].Options.indexOf(streamProfile.Video.Resolution) < 0) {
                streamProfile.Video.Resolution = query[0].Options[0];
                this.getCurrentStreamParam(); // 若有改值就重新找當前套用的StreamParam
            }
            return query[0].Options.sort(function (a, b) {
                const seq1 = a.split('x').map(result => Number(result));
                const seq2 = b.split('x').map(result => Number(result));
                return (seq1[0] >= seq2[0] && seq1[1] >= seq2[1]) ? 1 : ((seq2[0] >= seq1[0] && seq2[1] >= seq1[1]) ? -1 : 0);
            });
        } else {
            streamProfile.Video.Resolution = '';
            return [];
        }
    }

    getFpsOptionsByStreamId(id: number) {
        const param = this.getCurrnentStreamProfileParamById(id);
        if (!param || param.FpsOptions === undefined || param.FpsOptions.length === 0) {
            return [];
        }
        const streamProfile = this.currentCameraConfig.Config.Stream.find(x => x.Id === id);
        let query = param.FpsOptions;
        if (!StringHelper.isNullOrEmpty(streamProfile.Video.Encode)) {
            query = query.filter(x => x.Compression.some(encode => encode === streamProfile.Video.Encode) || x.Compression.length === 0);
        }
        if (this.currentCameraConfig.CameraSetting.PowerFrequency !== 0) {
            query = query.filter(x => x.PowerFrequency.some(pf => pf === String(this.currentCameraConfig.CameraSetting.PowerFrequency))
                || x.PowerFrequency.length === 0
                || x.PowerFrequency.indexOf('') > -1);
        }
        if (!StringHelper.isNullOrEmpty(streamProfile.Video.Resolution)) {
            query = query.filter(x => x.Resolution.indexOf(streamProfile.Video.Resolution) >= 0 || x.Resolution.length === 0);
        }
        if (query.length > 0) {
            if (query[0].Options.indexOf(String(streamProfile.Video.Fps)) < 0) {
                streamProfile.Video.Fps = Number(query[0].Options[0]);
                this.getCurrentStreamParam(); // 若有改值就重新找當前套用的StreamParam
            }
            return query[0].Options.sort(function (a, b) {
                return (Number(a) > Number(b)) ? 1 : ((Number(b) > Number(a)) ? -1 : 0);
            });
        } else {
            streamProfile.Video.Fps = 0;
            return [];
        }
    }

    getBitrateOptionsByStreamId(id: number) {
        const param = this.getCurrnentStreamProfileParamById(id);
        if (!param || param.BitrateOptions === undefined || param.BitrateOptions.length === 0) {
            return [];
        }
        const streamProfile = this.currentCameraConfig.Config.Stream.find(x => x.Id === id);
        let query = param.BitrateOptions;
        if (!StringHelper.isNullOrEmpty(streamProfile.Video.Encode)) {
            query = query.filter(x => x.Compression.indexOf(streamProfile.Video.Encode) >= 0 || x.Compression.length === 0);
        }
        if (!StringHelper.isNullOrEmpty(streamProfile.Video.Resolution)) {
            query = query.filter(x => x.Resolution.indexOf(streamProfile.Video.Resolution) >= 0 || x.Resolution.length === 0);
        }
        if (streamProfile.Video.Fps !== 0) {
            query = query.filter(x => x.Fps.indexOf(String(streamProfile.Video.Fps)) >= 0 || x.Fps.length === 0);
        }
        if (query.length > 0) { // 有至少一筆Bitrate選項
            const options = query[0].Options;
            if (options.length > 0
                && !options.some(x => x.value === String(streamProfile.Video.Bitrate))) {
                streamProfile.Video.Bitrate = Number(options[0].value);
            }
            return options;
        } else {
            streamProfile.Video.Bitrate = 0;
            return [];
        }
    }

    /** 依照modelCap內容，決定ProfileMode資料格式與取用方式 */
    getCurrentProfileModes() {
        if (this.jsonHelper.hasAttribute(this.modelCap, 'ProfileMode')) {
            return this.modelCap.ProfileMode; // example: axis Generic
        } else if (this.jsonHelper.hasAttribute(this.modelCap, 'TVStandard')) { // 因此function呼叫時可能仍未設定TVStandard value, 故需要在此設定預設值
            const tvsData = ArrayHelper.toArray(this.modelCap.TVStandard);
            const currentTvs = !tvsData.some(x => x.$.value === this.currentCameraConfig.CameraSetting.TVStandard)
                ? tvsData[0] : tvsData.find(x => x.$.value === this.currentCameraConfig.CameraSetting.TVStandard);
            return currentTvs.ProfileMode;
        } else if (this.jsonHelper.hasAttribute(this.modelCap, 'SensorMode')) {
            const ssModeData = ArrayHelper.toArray(this.modelCap.SensorMode);
            let currentSensorMode: any;
            if (this.jsonHelper.findAttributeByString(ssModeData[0], '$.value') !== undefined) {
                currentSensorMode = !ssModeData.some(x => x.$.value === this.currentCameraConfig.CameraSetting.SensorMode)
                    ? ssModeData[0] : ssModeData.find(x => x.$.value === this.currentCameraConfig.CameraSetting.SensorMode);
            } else {
                currentSensorMode = this.modelCap.SensorMode;
            }
            return currentSensorMode.ProfileMode;
        } else if (this.jsonHelper.hasAttribute(this.modelCap, 'PowerFrequency')) { // for AMTK
            const pfData = ArrayHelper.toArray(this.modelCap.PowerFrequency);
            let currentPowerFrequency: any;
            if (this.jsonHelper.findAttributeByString(pfData[0], '$.value') !== undefined) {
                currentPowerFrequency = !pfData.some(x => x.$.value === this.currentCameraConfig.CameraSetting.PowerFrequency)
                    ? pfData[0] : pfData.find(x => x.$.value === this.currentCameraConfig.CameraSetting.PowerFrequency);
            } else {
                currentPowerFrequency = this.modelCap.PowerFrequency;
            }

            if (this.jsonHelper.hasAttribute(currentPowerFrequency, 'AspectRatio')) { // DLink
                const arData = ArrayHelper.toArray(currentPowerFrequency.AspectRatio);
                let currentAspectRatio: any;
                if (this.jsonHelper.findAttributeByString(arData[0], '$.value') !== undefined) {
                    currentAspectRatio = !arData.some(x => x.$.value === this.currentCameraConfig.CameraSetting.AspectRatio)
                        ? arData[0] : arData.find(x => x.$.value === this.currentCameraConfig.CameraSetting.AspectRatio);
                } else {
                    currentAspectRatio = currentPowerFrequency.AspectRatio;
                }
                return currentAspectRatio.ProfileMode;
            }
            return currentPowerFrequency.ProfileMode;

        } else if (this.jsonHelper.hasAttribute(this.modelCap, 'AspectRatio')) { // DLink
            const arData = ArrayHelper.toArray(this.modelCap.AspectRatio);
            let currentAspectRatio: any;
            if (this.jsonHelper.findAttributeByString(arData[0], '$.value') !== undefined) {
                currentAspectRatio = !arData.some(x => x.$.value === this.currentCameraConfig.CameraSetting.AspectRatio)
                    ? arData[0] : arData.find(x => x.$.value === this.currentCameraConfig.CameraSetting.AspectRatio);
            } else {
                currentAspectRatio = this.modelCap.AspectRatio;
            }
            return currentAspectRatio.ProfileMode;
        } else {
            return undefined;
        }
    }

    /** 取得目前條件下應採用的ProfileMode */
    getCurrentProfileMode() {
        let profileModes = this.getCurrentProfileModes();
        if (profileModes === undefined) {
            return undefined;
        }
        profileModes = ArrayHelper.toArray(profileModes);
        const currentProfileMode = this.currentCameraConfig.CameraSetting.Mode === 0
            ? profileModes[0] : profileModes.find(x => x.$.value === String(this.currentCameraConfig.CameraSetting.Mode));
        return currentProfileMode;
    }

    /** 取得Mode可用選項 */
    getModeOptions(): any[] {
        console.debug("this.modelCap", this.modelCap);
        const result = [];
        let modelCapManufacture = Array.isArray(this.modelCap.Manufacture) ? this.modelCap.Manufacture[0].toLowerCase() : this.modelCap.Manufacture.toLowerCase();
        // Special case for brand:Customization(RTSP)
        if (modelCapManufacture === 'customization') {
            for (let i = 1; i <= 4; i++) {
                const item = ProfileModes.find(x => x.value === i.toString());
                if (item) {
                    result.push(item);
                }
            }
            return result;
        }

        const profileModes = this.getCurrentProfileModes();
        if (profileModes === undefined) {
            return result;
        }
        const profileModeArray = ArrayHelper.toArray(profileModes);
        profileModeArray.forEach(element => {
            const item = ProfileModes.find(x => x.value === element.$.value);
            if (item) {
                if (item.value === '5' && QuadSpecialModel.indexOf(this.modelCap.Model) >= 0) { // Axis Quad設計意義不明, 先跳過
                    return;
                }
                result.push(item);
            }
        });
        return result;
    }

    /** 取得LiveStream and RecordStream 使用的選單內容 */
    getStreamOptions(): any[] {
        let result: { key: string, value: number }[] = [];
        let brand = Array.isArray(this.modelCap.Manufacture) ? this.modelCap.Manufacture[0].toLowerCase() : this.modelCap.Manufacture.toLowerCase();
        const model = this.modelCap.Model.toLowerCase();
        // Special case for brand ONVIF
        if (brand === 'onvif') {
            result.push({ key: 'Video Stream Profile ' + 1, value: 1 });
            return result;
        }
        // Special case for customization
        if (brand === 'customization') {
            if (this.currentCameraConfig.CameraSetting.Mode === 0) {
                return result;
            } else {
                const count = Number(this.currentCameraConfig.CameraSetting.Mode);
                for (let i = 1; i <= count; i++) {
                    result.push({ key: 'Video Stream Profile ' + i, value: i });
                }
                return result;
            }
        }

        const profileMode = this.getCurrentProfileMode();
        if (profileMode === undefined) {
            return result;
        } else {
            if (NumberHelper.isNumber(profileMode.$.value)) {
                const count = Number(profileMode.$.value);
                const additionData = [];
                // 疑問: 為何要多出這個奇怪的選項?
                // if (count === 5 && QuadSpecialModel.indexOf(this.modelCap.Model) >= 0) { // Quad special model from Axis
                //     count = 2;
                //     additionData.push({ key: 'Video Stream Profile 3 (QUAD)', value: '3' });
                // }
                for (let i = 1; i <= count; i++) {
                    result.push({ key: 'Video Stream Profile ' + i, value: i });
                }

                if (additionData.length > 0) {
                    result = result.concat(additionData);
                }
            }
            return result;
        }
    }

    /** 從Capability取得當前條件下所有StreamProfile可能的Param */
    getStreamProfileParam() {
        const result = [];
        const profileMode = this.getCurrentProfileMode();
        if (profileMode === undefined) {
            return result;
        } else {
            const profileNode = ArrayHelper.toArray(profileMode.Profile);
            if (profileNode) {
                profileNode.forEach(element => {
                    const profileIds = this.jsonHelper.findAttributeByString(element, '$.id');
                    if (profileIds) {
                        const seq = String(profileIds).split(',');
                        seq.forEach(id => {
                            if (profileMode.Profile.DeviceMountType) { // case: Axis某些model
                                this.getStreamProfileParamWithMountType(id, element.DeviceMountType, result);
                            } else {
                                result.push(new StreamProfileParamV2({
                                    brand: this.currentCameraConfig.Config.Brand, id: id,
                                    data: element,
                                    defaultCompression: this.CompressionOptions,
                                    defaultBitrate: this.modelCap.Bitrate,
                                    sensorModeOptions: this.SensorModeOptions,
                                    powerFrequencyOptions: this.PowerFrequencyOptions,
                                    aspectRatioOptions: this.AspectRatioOptions
                                }));
                            }
                        });
                    }
                });
            }
            return result;
        }
    }

    getStreamProfileParamWithMountType(id: string, deviceMountType: any, result: any[]) {
        let tempArray = [];
        if (Array.isArray(deviceMountType)) {
            tempArray = deviceMountType;
        } else {
            tempArray.push(deviceMountType);
        }

        tempArray.forEach(element => {
            const mountTypeValue = this.jsonHelper.findAttributeByString(element, '$.value');
            this.getStreamProfileParamWithDewarpMode(id, mountTypeValue, element.DewarpMode, result);
        });
    }

    getStreamProfileParamWithDewarpMode(id: string, mountType: string, dewarpMode: any, result: any[]) {
        let tempArray = [];
        if (Array.isArray(dewarpMode)) {
            tempArray = dewarpMode;
        } else {
            tempArray.push(dewarpMode);
        }

        tempArray.forEach(element => {
            const modeValue = this.jsonHelper.findAttributeByString(element, '$.value');
            result.push(new StreamProfileParamV2({
                brand: this.currentCameraConfig.Config.Brand, id: id, data: element,
                defaultCompression: this.CompressionOptions,
                mountType: mountType, dewarpMode: modeValue,
                sensorModeOptions: this.SensorModeOptions.length === 0 ? this.SensorModeOptions : undefined,
                powerFrequencyOptions: this.PowerFrequencyOptions.length === 0 ? this.PowerFrequencyOptions : undefined,
                aspectRatioOptions: this.AspectRatioOptions
            }));
        });
    }

    /** 取得不受Profile影響的PowerFrequency選項 */
    getPowerFrequencyOptions(): any[] {
        const result = [];

        // 少部分capability(ex: ArecontVision)會直接把PowerFrequency選項放在第一層
        const pfNode = this.jsonHelper.findAttributeByString(this.modelCap, 'PowerFrequency');
        if (pfNode !== undefined) {
            if (typeof pfNode === 'string') { // ArecontVision例外處理
                const pfValue = pfNode.split(',');
                pfValue.forEach(pf => {
                    result.push({ key: pf + 'Hz', value: pf });
                });
            }
            if (Array.isArray(pfNode)) { // AMTK
                pfNode.forEach(pf => {
                    const pfValue = this.jsonHelper.findAttributeByString(pf, '$.value');
                    if (pfValue) {
                        result.push({ key: pfValue + 'Hz', value: pfValue });
                    }
                });
            }
            return result;
        }
        return result;
    }

    /** 取得在ProfileMode上層的AspectRatio選項 */
    getAspectRatioOptions(): any[] {
        function getOptions(arData: any[]) {
            return arData.map(x => x.$.value);
        }

        // 少部分capability(ex: DLink)會直接把AspectRatio選項放在前兩層
        if (this.jsonHelper.hasAttribute(this.modelCap, 'AspectRatio')) {
            const arData = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(this.modelCap, 'AspectRatio'));
            return getOptions(arData);
        }
        const pfData = this.jsonHelper.findAttributeByString(this.modelCap, 'PowerFrequency');
        if (pfData !== undefined && Array.isArray(pfData)) {
            let currentPowerFrequency: any;
            if (this.jsonHelper.findAttributeByString(pfData[0], '$.value') !== undefined) {
                currentPowerFrequency = !pfData.some(x => x.$.value === this.currentCameraConfig.CameraSetting.PowerFrequency)
                    ? pfData[0] : pfData.find(x => x.$.value === this.currentCameraConfig.CameraSetting.PowerFrequency);
            } else {
                currentPowerFrequency = this.modelCap.PowerFrequency;
            }
            const arData = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(currentPowerFrequency, 'AspectRatio'));
            console.debug("arData4",arData);
            return arData ? getOptions(arData) : [];
        }

        return [];
    }

    getMountTypeOptions(): string[] {
        const profileMode = this.getCurrentProfileMode();
        const result = [];
        if (profileMode === undefined) {
            return result;
        }
        const checkPath = ['Profile.DeviceMountType'];
        if (profileMode.Profile && profileMode.Profile.DeviceMountType) {
            if (Array.isArray(profileMode.Profile.DeviceMountType)) {
                profileMode.Profile.DeviceMountType.forEach(element => {
                    const types = String(element.$.value).split(',');
                    types.forEach(type => {
                        if (result.indexOf(type) < 0) {
                            result.push(type);
                        }
                    });
                });
            } else {
                return String(profileMode.Profile.DeviceMountType.$.value).split(',');
            }
        }
        return result;
    }

    getDewarpModeOptions(id: number): string[] {
        if (!this.StreamProfileParams) {
            return [];
        }
        const result = [];
        let query = this.StreamProfileParams;
        if (!StringHelper.isNullOrEmpty(this.currentCameraConfig.CameraSetting.MountType)) {
            query = query.filter(x => x.Mounttype.indexOf(this.currentCameraConfig.CameraSetting.MountType) >= 0
                || x.Mounttype.length === 0);
        }
        if (query.length > 0) {
            query = query.filter(x => x.Id === id);
            query.forEach(element => {
                if (!StringHelper.isNullOrEmpty(element.DewarpMode)) {
                    result.push(element.DewarpMode);
                }
            });
        }
        return result;
    }

    getStreamSaveNumberBeforeSave() {
        if (!this.currentCameraConfig) {
            return;
        }
        // Authentication.OccupancyPriority, 題目 Who has higher channel occupancy priority? 只出現在isap smart系列
        this.currentCameraConfig.Config.Authentication.OccupancyPriority
            = +this.currentCameraConfig.Config.Authentication.OccupancyPriority;
        // Config.Multi-stream
        ['High', 'Medium', 'Low'].forEach(key => {
            this.currentCameraConfig.Config['Multi-Stream'][key] = + this.currentCameraConfig.Config['Multi-Stream'][key];
        });
        // CameraSetting.Live Stream / Record Stream
        ['Mode', 'LiveStream', 'RecordStream', 'PowerFrequency'].forEach(key => {
            this.currentCameraConfig.CameraSetting[key] = + this.currentCameraConfig.CameraSetting[key];
        });
        // Stream內的屬性
        this.currentCameraConfig.Config.Stream.forEach(stream => {
            ['Quality', 'Fps', 'Bitrate', 'ChannelId'].forEach(key => {
                stream.Video[key] = +stream.Video[key];
            });
            // Only ArecontVision
            if (stream.Video.MotionThreshold) {
                stream.Video.MotionThreshold = +stream.Video.MotionThreshold;
            }
        });
    }

    /** 因解析度選單為寬x高的字串，在儲存前需先將此字串轉為個別的寬與高屬性，記錄在device/config/stream/video/width and height */
    getResolutionBeforeSave() {
        console.debug("getResolutionBeforeSave", this.currentCameraConfig);
        if (!this.currentCameraConfig) {
            return;
        }
        this.currentCameraConfig.Config.Stream.forEach(stream => {
            const seq = String(stream.Video.Resolution).split(/x|-/);
            stream.Video.Width = seq[0] ? Number(seq[0]) : 0;
            stream.Video.Height = seq[1] ? Number(seq[1]) : 0;
            // stream.Video.Resolution = undefined; // remove temp attribute
        });
    }

    /** 依照型號判斷是否為RTSP，移除不需儲存的屬性 */
    removeAttributesBeforeSave() {
        let modelCapManufacture = Array.isArray(this.modelCap.Manufacture) ? this.modelCap.Manufacture[0].toLowerCase() : this.modelCap.Manufacture.toLowerCase();
        if (modelCapManufacture !== 'customization') {
            this.currentCameraConfig.Config.Stream.forEach(element => {
                delete element.RTSPURI;
                delete element.RecorderId;
                delete element.RecordPathId;
                delete element.KeepDays;
            });
            delete this.currentCameraConfig.CameraSetting.Url;
            delete this.currentCameraConfig.CameraSetting.Interval;
            delete this.currentCameraConfig.CameraSetting.RetryCount;
            delete this.currentCameraConfig.CameraSetting.PTZCommands;
        } else {
            this.removePTZCommandsNullObj(this.currentCameraConfig.CameraSetting.PTZCommands);
        }
    }

    /** 移除空白的 PTZ Command */
    removePTZCommandsNullObj(ptz: PTZCommands) {
        const allPresets = [ptz.Actions, ptz.AddPreset, ptz.GotoPreset, ptz.DeletePreset];
        allPresets.forEach(preset => {
            for (let i = 0; i < preset.length; ) {
                if (StringHelper.isNullOrEmpty(preset[i].Command) && StringHelper.isNullOrEmpty(preset[i].Parameter)) {
                    preset.splice(i, 1);
                } else {
                    i++;
                }
            }
        });
    }
}

class PTZCommands {
    Actions: PTZCommand[];
    AddPreset: PTZCommand[];
    GotoPreset: PTZCommand[];
    DeletePreset: PTZCommand[];

    constructor(data: Device) {
        const ptzActions = [
            'Up', 'Down', 'Left', 'Right', 'Top Left', 'Down Left', 'Top Right', 'Down Right',
            'Stop', 'Zoom In', 'Zoom Out', 'Zoom Stop', 'Focus In', 'Focus Out', 'Focus Stop'
        ];

        const hasOrigin = data.CameraSetting.PTZCommands && data.CameraSetting.PTZCommands.Actions;

        // Actions
        this.Actions = [];
        ptzActions.forEach(element => {
            let item: any;
            if (hasOrigin) {
                item = data.CameraSetting.PTZCommands.Actions.find(x => x.Name === element);
            }
            if (item) {
                this.Actions.push(item); // 已存在的資料
            } else {
                this.Actions.push(new PTZCommand(element));
            }
        });

        // 三組Presets
        this.AddPreset = [];
        this.GotoPreset = [];
        this.DeletePreset = [];
        const presets = ['AddPreset', 'GotoPreset', 'DeletePreset'];
        for (let i = 1; i <= 10; i++) {
            presets.forEach(element => {
                let item: any;
                if (hasOrigin) {
                    item = data.CameraSetting.PTZCommands[element].find(x => x.Name === i.toString());
                }
                if (item) {
                    this[element].push(item); // 已存在的資料
                } else {
                    this[element].push(new PTZCommand(i.toString()));
                }
            });
        }
    }
}

class PTZCommand {
    Name: string;
    Method: string;
    Command: string;
    Parameter?: string;
    constructor(name: string) {
        this.Name = name;
        this.Method = 'Get';
    }

    onChangedMethod() {
        if (this.Method !== 'Post') {
            this.Parameter = '';
        }
    }
}
