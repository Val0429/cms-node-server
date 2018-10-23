import { JsonHelper } from 'app/helper/json.helper';
import arrayHelper, { ArrayHelper } from 'app/helper/array.helper';
import { StringHelper } from 'app/helper/string.helper';

interface ICompressionOption {
    /** 過濾條件 */
    SensorMode: string[];
    Options: string[];
}
interface IBitrateOption {
    /** 過濾條件 */
    Compression: string[];
    /** 過濾條件 */
    Resolution: string[];
    /** 過濾條件 */
    Fps: string[];
    /** 選項內容 */
    Options: { key: string, value: string }[];
}
interface IResolutionOption {
    /** 過濾條件 */
    PowerFrequency: string[];
    /** 過濾條件 螢幕比率 */
    AspectRatio: string[];
    /** 過濾條件 'true' or 'false'*/
    AspectRatioCorrection: string;
    /** 過濾條件 */
    Compression: string[];
    /** 過濾條件 */
    SensorMode: string[];
    /** 選項內容 */
    Options: string[];
}
interface IFpsOption {
    Compression: string[];
    /** 過濾條件 */
    PowerFrequency: string[];
    /** 過濾條件 */
    Resolution: string[];
    /** 選項內容 */
    Options: string[];
}
interface IPowerFrequencyOption {
    key: string;
    value: string;
}
export class StreamProfileParamV2 {
    jsonHelper = JsonHelper.instance;
    /** 製造商 */
    Brand: string;
    /** Stream Profile Id */
    Id: number;
    // #region 過濾條件
    /** 過濾條件 */
    Mounttype: string[];
    /** 過濾條件 */
    DewarpMode: string;
    /** 過濾條件 */
    PowerFrequency: string[];
    /** 過濾條件 */
    AspectRatio: string[];
    /** 過濾條件 */
    PreStreamCompression: string[];
    /** 過濾條件 */
    PreStreamResolution: string[];
    /** 過濾條件 */
    PreStreamFps: string[];
    // #endregion
    Child: StreamProfileParamV2[];
    CompressionOptions: ICompressionOption[];
    BitrateOptions: IBitrateOption[];
    ResolutionOptions: IResolutionOption[];
    FpsOptions: IFpsOption[];

    constructor(args: {
        brand: string, // 廠牌
        id: string, // StreamId
        data: any, // Json
        defaultCompression?: string[], // 外部或parent現有的Compression選項
        defaultBitrate?: string, // 外部現有的Bitrate
        powerFrequency?: string[], // parent使用的PowerFrequency條件
        mountType?: string, dewarpMode?: string,
        sensorModeOptions?: string[],
        powerFrequencyOptions?: IPowerFrequencyOption[], // 若該廠牌的PowerFrequency選項放在Profile之內，在巡覽時一併放入選項
        aspectRatioOptions?: string[],
        aspectRatioValue?: string[],
        preStreamCompression?: string[] // for messoa
        preStreamResolution?: string[], // for messoa
        preStreamFps?: string[],
    }) {
        this.Brand = args.brand;
        this.Id = Number(args.id);
        this.PowerFrequency = args.powerFrequency ? args.powerFrequency : []; // 只會在child出現, 作為找不到PowerFrequency條件時的預設值
        this.Mounttype = args.mountType ? args.mountType.split(',') : [];
        this.DewarpMode = args.dewarpMode ? args.dewarpMode : '';
        this.AspectRatio = args.aspectRatioValue ? args.aspectRatioValue : [];
        this.PreStreamCompression = args.preStreamCompression ? args.preStreamCompression : [];
        this.PreStreamResolution = args.preStreamResolution ? args.preStreamResolution : [];
        this.PreStreamFps = args.preStreamFps ? args.preStreamFps : [];

        const brandName = this.Brand.toLowerCase();

        /** 下方各brand註解處理代號
         *  C=Compression: 通常在profileMode最上層
         *  B=Bitrate: 神出鬼沒
         *  R=Resolution: 通常在Compression之下
         *  F=Fps=FrameRate: 通常在一個Profile的最底層
         *  Child: 通常是受到此profile影響的其他child。
         *    例如stream 1的resolution影響到stream 2的compression, 則stream 2的profile就會是stream 1的child
         *  括號(): 代表上述內容可能的出現位置
         */

        if (brandName === 'axis') { // 無階層關係, 有外部Compression
            this.basic_Compression({ defaultCompression: args.defaultCompression });
            this.basic_Bitrate({ json: args.data });
            this.basic_Resolution({ json: args.data, powerFrequencyOptions: args.powerFrequencyOptions });
            this.basic_Fps({ json: args.data, powerFrequencyOptions: args.powerFrequencyOptions });
        }

        if (brandName === 'hikvision') { // C->B,R->F->Child
            this.Child = [];

            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                this.basic_Bitrate({ json: cNode.json });
                const rNodes = this.basic_Resolution({
                    json: cNode.json, powerFrequencyOptions: args.powerFrequencyOptions, compression: cNode.options
                });
                rNodes.forEach(rNode => {
                    const fNodes = this.basic_Fps({
                        json: rNode.json,
                        powerFrequencyOptions: args.powerFrequencyOptions,
                        compression: cNode.options,
                        resolution: rNode.options,
                        powerFrequency: rNode.powerFrequency
                    });
                    fNodes.forEach(fNode => {
                        this.basic_Child({
                            json: fNode.json,
                            powerFrequencyValue: rNode.powerFrequency,
                            preStreamCompression: cNode.options,
                            preStreamResolution: rNode.options,
                            preStreamFps: fNode.options
                        });
                    });
                });
            });
        }

        if (['dahua', 'goodwill', 'mobotix'].indexOf(brandName) > -1) { // C->R->F->B
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options });
                rNodes.forEach(rNode => {
                    const fNodes = this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                    fNodes.forEach(fNode => {
                        this.basic_Bitrate({ json: fNode.json, compression: cNode.options, resolution: rNode.options, fps: fNode.options });
                    });
                });
            });
        }

        if (['certis', 'd-link', 'dynacolor'].indexOf(brandName) > -1) { // (B),C->(B),R->(B),F->Child
            this.Child = [];

            this.basic_Bitrate({ json: args.data }); // Bitrate可能位置1
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                this.basic_Bitrate({ json: cNode.json, compression: cNode.options }); // Bitrate可能位置2
                const rNodes = this.basic_Resolution({
                    json: cNode.json, powerFrequencyOptions: args.powerFrequencyOptions, compression: cNode.options
                });
                rNodes.forEach(rNode => {
                    this.basic_Bitrate({ json: rNode.json, compression: cNode.options, resolution: rNode.options }); // Bitrate可能位置3
                    const fNodes = this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                    fNodes.forEach(fNode => {
                        this.basic_Child({
                            json: fNode.json,
                            powerFrequencyValue: rNode.powerFrequency,
                            preStreamCompression: cNode.options,
                            preStreamResolution: rNode.options,
                            preStreamFps: fNode.options
                        });
                    });
                });
            });
        }

        if (brandName === 'arecontvision') { // C,B,R->F
            this.basic_Compression({ json: args.data });
            this.basic_Bitrate({ json: args.data });
            const rNodes = this.basic_Resolution({ json: args.data });
            rNodes.forEach(rNode => {
                this.basic_Fps({ json: rNode.json, resolution: rNode.options });
            });
        }

        if (['vivotek', 'a-mtk'].indexOf(brandName) > -1) { // (S)->(R),C->(R)->F,B
            // Resolution固定流程
            const doResolution = (args2: { json: any, sensorMode?: string[], compression?: string[] }) => {
                const rNodes = this.basic_Resolution({ json: args2.json, sensorMode: args2.sensorMode, compression: args2.compression });
                rNodes.forEach(rNode => {
                    this.basic_Fps({
                        json: rNode.json, powerFrequencyOptions: args.powerFrequencyOptions,
                        compression: args2.compression, resolution: rNode.options
                    });
                    this.basic_Bitrate({ json: rNode.json, compression: args2.compression, resolution: rNode.options });
                });
            };

            // Compression固定流程
            const doCompression = (args2: { json: any, sensorMode?: string[] }) => {
                const cNodes = this.basic_Compression({ json: args2.json, sensorMode: args2.sensorMode }); // Compression可能位置1
                cNodes.forEach(cNode => {
                    doResolution({ json: cNode.json, sensorMode: args2.sensorMode, compression: cNode.options }); // Resolution可能位置1
                });
                doResolution({ json: args2.json, sensorMode: args2.sensorMode }); // Resolution可能位置2
            };

            // 處理條件包含SensorMode的部分
            const sNodes = this.addition_SensorMode({ json: args.data, sensorModeOptions: args.sensorModeOptions });
            sNodes.forEach(sNode => {
                doCompression({ json: sNode.json, sensorMode: sNode.options });
            });
            // 處理條件不含SensorMode的部分
            doCompression({ json: args.data });
        }

        if (brandName === 'acti') { // C->B,A->R->F,Child
            this.Child = [];

            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                this.basic_Bitrate({ json: cNode.json, compression: cNode.options });
                // 處理有AspectRatio的部分
                const aNodes = this.addition_AspectRatio({ json: cNode.json, aspectRatioOptions: args.aspectRatioOptions });
                aNodes.forEach(aNode => {
                    const rNodes = this.basic_Resolution({ json: aNode.json, aspectRatio: aNode.options, compression: cNode.options });
                    rNodes.forEach(rNode => {
                        this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                        this.basic_Child({
                            json: rNode.json,
                            aspectRatioOptions: args.aspectRatioOptions,
                            aspectValue: aNode.options,
                            preStreamCompression: cNode.options,
                            preStreamResolution: rNode.options
                        });
                    });
                });

                // 處理不包含AspectRatio的部分
                const rNodes = this.basic_Resolution({
                    json: cNode.json, aspectRatio: args.aspectRatioOptions, compression: cNode.options
                });
                rNodes.forEach(rNode => {
                    const fNodes = this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                    fNodes.forEach(fNode => {
                        this.basic_Child({
                            json: fNode.json,
                            aspectRatioOptions: args.aspectRatioOptions,
                            preStreamCompression: cNode.options,
                            preStreamResolution: rNode.options,
                            preStreamFps: fNode.options
                        });
                    });

                    // Acti特殊狀況 ex:model TCM5311, 雙層時的StreamId = 1, 在Resolution之下沒有FPS, 其來源為Child的FPS選項聯集
                    this.basic_Child({
                        json: rNode.json, aspectRatioOptions: args.aspectRatioOptions,
                        preStreamCompression: cNode.options, preStreamResolution: rNode.options
                    });
                    const unionFps = [];
                    this.Child.forEach(child => {
                        child.FpsOptions.forEach(opt => {
                            ArrayHelper.combineArray(unionFps, opt.Options);
                        });
                    });
                    this.insertFps({
                        Compression: Object.assign([], cNode.options),
                        PowerFrequency: [],
                        Resolution: Object.assign([], rNode.options),
                        Options: unionFps
                    });
                });
            });
        }

        if (brandName === 'bosch') { // Only Bitrate
            this.basic_Compression({ json: args.data });
            this.ResolutionOptions = [];
            this.FpsOptions = [];
            this.BitrateOptions = [];
        }

        if (['fine', 'siemens'].indexOf(brandName) > -1) { // (S)->C->R->(B),F->(B),Child
            this.Child = [];

            const doCompression = (args2: { json: any, sensorMode?: string[] }) => {
                const cNodes = this.basic_Compression({ json: args2.json, sensorMode: args2.sensorMode });
                cNodes.forEach(cNode => {
                    const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options, sensorMode: args2.sensorMode });
                    rNodes.forEach(rNode => {
                        // Bitrate可能位置1: 在Resolution底下
                        this.basic_Bitrate({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                        const fNodes = this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                        fNodes.forEach(fNode => {
                            // Bitrate可能位置2: 在FPS底下
                            this.basic_Bitrate({
                                json: fNode.json, compression: cNode.options, resolution: rNode.options, fps: fNode.options
                            });
                            this.basic_Child({
                                json: fNode.json, preStreamCompression: cNode.options,
                                preStreamResolution: rNode.options, preStreamFps: fNode.options
                            });
                        });
                    });
                });
            };

            // 處理條件包含SensorMode的部分
            const sNodes = this.addition_SensorMode({ json: args.data, sensorModeOptions: args.sensorModeOptions });
            sNodes.forEach(sNode => {
                doCompression({ json: sNode.json, sensorMode: sNode.options });
            });
            // 處理條件不含SensorMode的部分
            doCompression({ json: args.data });
        }

        if (['panasonic', 'zeroone'].indexOf(brandName) > -1) { // C->B,R->F
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                this.basic_Bitrate({ json: cNode.json, compression: cNode.options });
                const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options });
                rNodes.forEach(rNode => {
                    this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                });
            });
        }

        if (['samsung', 'inskytec', 'surveon', 'zavio'].indexOf(brandName) > -1) { // C->R->B,F
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options });
                rNodes.forEach(rNode => {
                    this.basic_Bitrate({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                    this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                });
            });
        }

        if (['sony', 'diviotec', 'avigilon', 'megasys'].indexOf(brandName) > -1) { // C->B,R->F->Child
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                this.basic_Bitrate({ json: cNode.json, compression: cNode.options });
                const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options });
                rNodes.forEach(rNode => {
                    const fNodes = this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                    fNodes.forEach(fNode => {
                        this.basic_Child({
                            json: fNode.json, preStreamCompression: cNode.options,
                            preStreamResolution: rNode.options, preStreamFps: fNode.options
                        });
                    });
                });
            });
        }

        if (['etrovision', 'everfocus', 'ip surveillance', 'nexcom', 'yuan', 'xts corp.'].indexOf(brandName) > -1) { // 無階層關係
            this.basic_Compression({ json: args.data });
            this.basic_Bitrate({ json: args.data });
            this.basic_Resolution({ json: args.data, powerFrequencyOptions: args.powerFrequencyOptions });
            this.basic_Fps({ json: args.data, powerFrequencyOptions: args.powerFrequencyOptions });
        }

        if (['pulse', 'vigzul'].indexOf(brandName) > -1) { // C->B,R->F,Child
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                this.basic_Bitrate({ json: cNode.json, compression: cNode.options, defaultBitrate: args.defaultBitrate });
                const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options });
                rNodes.forEach(rNode => {
                    this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                    this.basic_Child({
                        json: rNode.json, defaultBitrate: args.defaultBitrate,
                        preStreamCompression: cNode.options, preStreamResolution: rNode.options
                    });
                });
            });
        }

        if (brandName === 'brickcom') { // C->B,R->Child,F->Child
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                this.basic_Bitrate({ json: cNode.json, compression: cNode.options, defaultBitrate: args.defaultBitrate });
                const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options });
                rNodes.forEach(rNode => {
                    const fNodes = this.basic_Fps({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                    fNodes.forEach(fNode => {
                        // Child可能位置1
                        this.basic_Child({
                            json: fNode.json, defaultBitrate: args.defaultBitrate,
                            preStreamCompression: cNode.options, preStreamResolution: rNode.options, preStreamFps: fNode.options
                        });
                    });
                    // Child可能位置2
                    this.basic_Child({
                        json: rNode.json, defaultBitrate: args.defaultBitrate,
                        preStreamCompression: cNode.options, preStreamResolution: rNode.options
                    });
                });
            });
        }

        if (brandName === 'messoa') { // C->(B,F,Child),R->(B,F,Child)
            const doBFC = (args2: { json?: any, compression?: string[], resolution?: string[] }) => {
                this.basic_Bitrate({ json: args2.json, compression: args2.compression, resolution: args2.resolution });
                this.basic_Fps({ json: args2.json, compression: args2.compression, resolution: args2.resolution });
                this.basic_Child({ json: args2.json, preStreamCompression: args2.compression, preStreamResolution: args2.resolution });
            };
            const cNodes = this.basic_Compression({ json: args.data });
            cNodes.forEach(cNode => {
                const rNodes = this.basic_Resolution({ json: cNode.json, compression: cNode.options });
                rNodes.forEach(rNode => {
                    doBFC({ json: rNode.json, compression: cNode.options, resolution: rNode.options });
                });
                doBFC({ json: cNode.json, compression: cNode.options });
            });
        }

        this.combineCompression();
        this.combineResolution();
        this.combineFps();
        this.combineBitrate();
        if (!this.Child) {
            this.Child = [];
        }
    }

    /** 填入SensorMode/PowerFrequency選項，避免重複
     * 使用在Brand: Vivotek
     */
    insertStringOption(newValue: string, result: string[]) {
        if (!newValue || result === undefined) {
            return;
        }
        newValue.split(',').forEach(val => {
            if (result.indexOf(val) < 0) {
                result.push(val);
            }
        });
    }

    /** 將capability中的PowerFrequency選項放入list */
    insertPowerFrequency(newValue: string, result: IPowerFrequencyOption[]) {
        if (!newValue || result === undefined) {
            return;
        }
        newValue.split(',').forEach(val => {
            if (!result.some(x => x.value === val)) {
                result.push({ key: val + 'Hz', value: val });
            }
        });
    }

    /** 從Json檔中找到Compression資料並讀取為選項 */
    basic_Compression(args: {
        json?: any,
        sensorMode?: string[],
        defaultCompression?: string[]
    }) {
        if (args.defaultCompression) {
            this.insertCompression({
                sensorMode: args.sensorMode,
                options: args.defaultCompression
            });
            return;
        }

        if (!args.json) {
            return;
        }

        const result: { json: any, options: string[] }[] = [];
        const cNode = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(args.json, 'Compression'));
        if (cNode !== undefined) {
            cNode.forEach(compression => {
                const cValue = String(this.jsonHelper.findPathValue(compression, ['$.codes', '$.value', ''])).split(',');
                this.insertCompression({ options: cValue, sensorMode: args.sensorMode });
                if (cValue !== undefined) {
                    result.push({ json: compression, options: cValue });
                }
            });
        }
        return result;
    }

    /** 將從Capability中取得的Compression轉換為選項 */
    insertCompression(args: { options: string[], sensorMode?: string[], preStreamFps?: string[], preStreamResolution?: string[] }) {
        if (this.CompressionOptions === undefined) {
            this.CompressionOptions = [];
        }
        const nv: ICompressionOption = { Options: args.options, SensorMode: args.sensorMode ? Object.assign([], args.sensorMode) : [] };
        this.CompressionOptions.push(nv);
    }

    basic_Resolution(args: {
        json: any, powerFrequencyOptions?: IPowerFrequencyOption[],
        aspectRatio?: string[], arc?: string, compression?: string[], sensorMode?: string[]
    }) {
        if (!args.json) {
            return;
        }

        const result: { json: any, options: string[], powerFrequency: string[] }[] = [];
        const resolutionNode = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(args.json, 'Resolution'));
        if (resolutionNode !== undefined) {
            resolutionNode.forEach(resolution => {
                const rValue = this.processResolution({
                    json: resolution,
                    powerFrequencyOptions: args.powerFrequencyOptions,
                    aspectRatio: args.aspectRatio,
                    compression: args.compression,
                    sensorMode: args.sensorMode
                });
                if (rValue.options !== undefined) {
                    result.push({ json: resolution, options: rValue.options, powerFrequency: rValue.powerFrequency });
                }
            });
        }
        return result;
    }

    /** 在可能有Resolution資料的json物件中處理 */
    processResolution(args: {
        json: any, powerFrequencyOptions?: IPowerFrequencyOption[],
        aspectRatio?: string[], compression?: string[], sensorMode?: string[]
    }) {
        const resolutionValue = String(this.jsonHelper.findPathValue(args.json, ['$.value', '_', ''])).split(',');
        const powerFrequencyValue = this.jsonHelper.findPathValue(args.json, ['$.PowerFrequency', '$.powerFrequency']);
        const pfOptions = powerFrequencyValue !== undefined ? powerFrequencyValue.split(',') : this.PowerFrequency;
        if (resolutionValue !== undefined) {
            const aspectValue = this.jsonHelper.findAttributeByString(args.json, '$.arc');
            this.insertResolution({
                options: resolutionValue,
                powerFrequency: pfOptions,
                aspectRatio: args.aspectRatio,
                arc: aspectValue,
                compression: args.compression,
                sensorMode: args.sensorMode
            });
            if (args.powerFrequencyOptions && powerFrequencyValue) {
                this.insertPowerFrequency(powerFrequencyValue, args.powerFrequencyOptions);
            }
        }
        return { options: resolutionValue, powerFrequency: pfOptions };
    }

    /** 將從Capability中取得的Resolution轉換為選項 */
    insertResolution(args: {
        options: string[], powerFrequency?: string[], aspectRatio?: string[], arc?: string, compression?: string[], sensorMode?: string[]
    }) {
        if (this.ResolutionOptions === undefined) {
            this.ResolutionOptions = [];
        }
        const nv: IResolutionOption = {
            PowerFrequency: args.powerFrequency ? Object.assign([], args.powerFrequency) : [],
            AspectRatio: args.aspectRatio ? Object.assign([], args.aspectRatio) : [],
            AspectRatioCorrection: args.arc !== undefined ? args.arc : 'false',
            Compression: args.compression ? Object.assign([], args.compression) : [],
            SensorMode: args.sensorMode ? Object.assign([], args.sensorMode) : [],
            Options: this.parseResolutionOption(args.options)
        };
        this.ResolutionOptions.push(nv);
    }

    /** 為配合少部分brand的resolution格式差異，所有resolution條件、選項都要經過此處理 */
    parseResolutionOption(options: string[]) {
        return options.map(x => {
            const seq = x.split(/x|-/);
            return seq.length > 1 ? `${seq[0]}x${seq[1]}` : undefined;
        });
    }

    basic_Fps(args: {
        json: any, powerFrequencyOptions?: IPowerFrequencyOption[],
        compression?: string[], resolution?: string[], powerFrequency?: string[]
    }) {
        if (!args.json) {
            return;
        }

        const result: { json: any, options: string[] }[] = [];
        const fpsNode = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(args.json, 'FrameRate'));
        if (fpsNode !== undefined) {
            fpsNode.forEach(fps => {
                const options = this.processFps({
                    json: fps, powerFrequencyOptions: args.powerFrequencyOptions,
                    compression: args.compression, resolution: args.resolution, powerFrequency: args.powerFrequency
                });
                if (options !== undefined) {
                    result.push({ json: fps, options: options });
                }
            });
        }
        return result;
    }

    /** 在可能有Fps資料的json物件中處理 */
    processFps(args: {
        json: any, powerFrequencyOptions?: IPowerFrequencyOption[],
        compression?: string[], resolution?: string[], powerFrequency?: string[]
    }) {
        const frameRateValue = String(this.jsonHelper.findPathValue(args.json, ['$.value', '_', ''])).split(',');
        const powerFrequencyValue = this.jsonHelper.findAttributeByString(args.json, '$.PowerFrequency');
        if (frameRateValue !== undefined) {
            // PowerFrequency條件來源有三個可能
            let pfCondition = this.PowerFrequency;
            if (args.powerFrequency) {
                pfCondition = args.powerFrequency;
            }
            if (powerFrequencyValue !== undefined) {
                pfCondition = powerFrequencyValue.split(',');
            }

            this.insertFps({
                Compression: args.compression ? Object.assign([], args.compression) : [],
                PowerFrequency: pfCondition,
                Resolution: args.resolution ? this.parseResolutionOption(Object.assign([], args.resolution)) : [],
                Options: frameRateValue
            });
            this.insertPowerFrequency(powerFrequencyValue, args.powerFrequencyOptions);
        }
        return frameRateValue;
    }

    /** 將從Capability中取得的Fps轉換為選項 */
    insertFps(newValue: IFpsOption) {
        if (this.FpsOptions === undefined) {
            this.FpsOptions = [];
        }
        this.FpsOptions.push(newValue);
    }

    basic_Bitrate(args: { json: any, compression?: string[], resolution?: string[], fps?: string[], defaultBitrate?: string }) {
        if (args.defaultBitrate) {
            this.insertBitrate({
                json: args.defaultBitrate,
                compression: args.compression,
                resolution: args.resolution,
                fps: args.fps
            });
        }

        if (!args.json) {
            return;
        }

        const bitrateNode = this.jsonHelper.findAttributeByString(args.json, 'Bitrate');
        if (bitrateNode !== undefined) {
            this.insertBitrate({ json: bitrateNode, compression: args.compression, resolution: args.resolution, fps: args.fps });
        }
    }

    /** 將從Capability中取得的Bitrate轉換為選項 */
    insertBitrate(args: { json: any, compression?: string[], resolution?: string[], fps?: string[] }) {
        if (this.BitrateOptions === undefined) {
            this.BitrateOptions = [];
        }
        const nv: IBitrateOption = {
            Compression: args.compression ? Object.assign([], args.compression) : [],
            Resolution: args.resolution ? this.parseResolutionOption(Object.assign([], args.resolution)) : [],
            Fps: args.fps ? Object.assign([], args.fps) : [],
            Options: this.getBitrateFromConfig(args.json)
        };
        this.BitrateOptions.push(nv);
    }

    /** 將bitrate資料字串計算後轉為物件陣列 */
    getBitrateFromConfig(bitrateValue: string) {
        const tempBitrate = [];
        bitrateValue.split(',').forEach(bitrateString => {
            const unit = bitrateString.charAt(bitrateString.length - 1);
            let val = Number(bitrateString.substring(0, bitrateString.length - 1));

            // 若選項是以m為單位，進行轉換, ex: 1m=1024k
            switch (unit.toLowerCase()) {
                case 'm': val *= 1024; break;
            }

            tempBitrate.push({ key: bitrateString, value: val.toString() });
        });
        return tempBitrate;
    }

    basic_Child(args: {
        json: any, powerFrequencyValue?: string[],
        aspectRatioOptions?: string[], aspectValue?: string[],
        preStreamFps?: string[], preStreamResolution?: string[], preStreamCompression?: string[],
        defaultBitrate?: string
    }) {
        const childs = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(args.json, 'Profile'));
        if (childs !== undefined) {
            childs.forEach(child => {
                this.processChild({
                    json: child,
                    powerFrequency: args.powerFrequencyValue !== undefined
                        ? String(args.powerFrequencyValue).split(',') : this.PowerFrequency,
                    aspectRatioOptions: args.aspectRatioOptions,
                    aspectValue: args.aspectValue,
                    preStreamFps: args.preStreamFps,
                    preStreamResolution: this.parseResolutionOption(args.preStreamResolution),
                    preStreamCompression: args.preStreamCompression,
                    defaultBitrate: args.defaultBitrate
                });
            });
        }
    }

    /** 處理Child Profile */
    processChild(args: {
        json: any, powerFrequency?: string[],
        aspectRatioOptions?: string[], aspectValue?: string[],
        preStreamFps?: string[], preStreamResolution?: string[], preStreamCompression?: string[],
        defaultBitrate?: string
    }) {
        const idValues = this.jsonHelper.findAttributeByString(args.json, '$.id');
        if (idValues) {
            const newChild = new StreamProfileParamV2({
                brand: this.Brand,
                id: idValues,
                data: args.json,
                powerFrequency: args.powerFrequency ? Object.assign([], args.powerFrequency) : [],
                aspectRatioOptions: args.aspectRatioOptions ? Object.assign([], args.aspectRatioOptions) : [],
                aspectRatioValue: args.aspectValue ? Object.assign([], args.aspectValue) : [],
                preStreamFps: args.preStreamFps ? Object.assign([], args.preStreamFps) : [],
                preStreamResolution: args.preStreamResolution ? Object.assign([], args.preStreamResolution) : [],
                preStreamCompression: args.preStreamCompression ? Object.assign([], args.preStreamCompression) : [],
                defaultBitrate: args.defaultBitrate
            });
            if (newChild !== undefined) {
                if (!this.Child) {
                    this.Child = [];
                }
                this.Child.push(newChild);
            }
            return newChild;
        }
        return undefined;
    }

    /** 額外處理流程 for SensorMode */
    addition_SensorMode(args: { json: any, sensorModeOptions: string[] }) {
        if (!args.json) {
            return;
        }

        const result: { json: any, options: string[] }[] = [];
        const sensorModeNode = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(args.json, 'SensorMode'));
        if (sensorModeNode !== undefined) {
            sensorModeNode.forEach(sensorMode => {
                const sensorModeValue = this.jsonHelper.findAttributeByString(sensorMode, '$.value');
                if (sensorModeValue !== undefined) {
                    this.insertStringOption(sensorModeValue, args.sensorModeOptions);
                    result.push({ json: sensorMode, options: sensorModeValue.split(',') });
                }
            });
        }
        return result;
    }

    /** 額外處理流程 for AspectRatio */
    addition_AspectRatio(args: { json: any, aspectRatioOptions }) {
        if (!args.json) {
            return;
        }

        const result: { json: any, options: string[] }[] = [];
        const aspectNode = ArrayHelper.toArray(this.jsonHelper.findAttributeByString(args.json, 'AspectRatio'));
        if (aspectNode !== undefined) {
            aspectNode.forEach(aspect => {
                const aspectValue = this.jsonHelper.findAttributeByString(aspect, '$.value');
                if (aspectValue !== undefined) {
                    this.insertStringOption(aspectValue, args.aspectRatioOptions);
                    result.push({ json: aspect, options: aspectValue.split(',') });
                }
            });
        }
        return result;
    }

    /** 將已讀取出的所有Compression選項依照條件合併內容 */
    combineCompression() {
        const result = [];
        if (!this.CompressionOptions) {
            this.CompressionOptions = [{ SensorMode: [], Options: [] }];
            return;
        }
        if (this.CompressionOptions) {
            this.CompressionOptions.forEach(opt => {
                const sameItem = result.find(x => ArrayHelper.isEqual(x.SensorMode, opt.SensorMode));
                if (sameItem !== undefined) {
                    ArrayHelper.combineArray(sameItem.Options, opt.Options);
                } else {
                    result.push(opt);
                }
            });
        }
        this.CompressionOptions = result;
    }

    /** 將已讀取出的所有Resolution選項依照條件合併內容 */
    combineResolution() {
        const result = [];
        if (!this.ResolutionOptions) {
            this.ResolutionOptions = [{
                PowerFrequency: [], AspectRatio: [], AspectRatioCorrection: 'false',
                Compression: [], SensorMode: [], Options: []
            }];
            return;
        }
        this.ResolutionOptions.forEach(opt => {
            const sameItem = result.find(x => ArrayHelper.isEqual(x.PowerFrequency, opt.PowerFrequency)
                && ArrayHelper.isEqual(x.AspectRatio, opt.AspectRatio)
                && x.AspectRatioCorrection === opt.AspectRatioCorrection
                && ArrayHelper.isEqual(x.Compression, opt.Compression)
                && ArrayHelper.isEqual(x.SensorMode, opt.SensorMode));
            if (sameItem !== undefined) {
                ArrayHelper.combineArray(sameItem.Options, opt.Options); // 把B併入A且不重複
            } else {
                result.push(opt);
            }
        });
        this.ResolutionOptions = result;
    }

    /** 將已讀取出的所有FPS選項依照條件合併內容 */
    combineFps() {
        const result = [];
        if (!this.FpsOptions) {
            this.FpsOptions = [{ Compression: [], PowerFrequency: [], Resolution: [], Options: [] }];
            return;
        }
        this.FpsOptions.forEach(opt => {
            const sameItem = result.find(x => ArrayHelper.isEqual(x.Compression, opt.Compression)
                && ArrayHelper.isEqual(x.PowerFrequency, opt.PowerFrequency)
                && ArrayHelper.isEqual(x.Resolution, opt.Resolution));
            if (sameItem !== undefined) {
                ArrayHelper.combineArray(sameItem.Options, opt.Options); // 把B併入A且不重複
            } else {
                result.push(opt);
            }
        });
        this.FpsOptions = result;
    }

    /** 將已讀取出的所有Bitrate選項依照條件合併內容 */
    combineBitrate() {
        const result = [];
        if (!this.BitrateOptions) {
            this.BitrateOptions = [{ Compression: [], Resolution: [], Fps: [], Options: [] }];
            return;
        }
        this.BitrateOptions.forEach(opt => {
            const sameItem = result.find(x => ArrayHelper.isEqual(x.Compression, opt.Compression)
                && ArrayHelper.isEqual(x.Resolution, opt.Resolution)
                && ArrayHelper.isEqual(x.Fps, opt.Fps));
            if (sameItem !== undefined) {
                ArrayHelper.combineArray(sameItem.Options, opt.Options); // 把B併入A且不重複
            } else {
                result.push(opt);
            }
        });
        this.BitrateOptions = result;
    }
}
