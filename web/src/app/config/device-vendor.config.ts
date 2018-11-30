export interface IDeviceVendor {
    Key:string;
    Name: string;
    FileName: string;
}
export const DeviceVendor: IDeviceVendor[] = [
    { Key:"ACTi", Name: 'ACTi', FileName: 'acti.xml' },
    { Key:"A-MTK", Name: 'A-MTK', FileName: 'amtk.xml' },
    { Key:"ArecontVision", Name: 'ArecontVision', FileName: 'arecontvision.xml' },
    { Key:"AVIGILON", Name: 'Avigilon', FileName: 'avigilon.xml' },
    { Key:"AXIS", Name: 'Axis', FileName: 'axis.xml' },
    { Key:"BOSCH", Name: 'BOSCH', FileName: 'bosch.xml' },
    { Key:"BRICKOM", Name: 'Brickcom', FileName: 'brickcom.xml' },
    { Key:"CERTIS", Name: 'Certis', FileName: 'certis.xml' },
    { Key:"Customization", Name: 'Customization', FileName: 'customization.xml' },
    { Key:"DAHUA", Name: 'Dahua', FileName: 'dahua.xml' },
    { Key:"Diviotec", Name: 'DivioTec', FileName: 'diviotec.xml' },
    { Key:"DLINK", Name: 'D-Link', FileName: 'dlink.xml' },
    { Key:"Dynacolor", Name: 'Dynacolor', FileName: 'dynacolor.xml' },
    { Key:"ETROVISION", Name: 'ETROVISION', FileName: 'etrovision.xml' },
    { Key:"EVERFOCUS", Name: 'EverFocus', FileName: 'everfocus.xml' },
    { Key:"FINE", Name: 'FINE', FileName: 'fine.xml' },
    { Key:"GoodWill", Name: 'GoodWill', FileName: 'goodwill.xml' },
    { Key:"HIKVISION", Name: 'HIKVISION', FileName: 'hikvision.xml' },
    { Key:"INSKYTEC", Name: 'inskytec', FileName: 'inskytec.xml' },
    // { Name: 'iSapSolution', FileName: 'isapsolution.xml' },
    { Key:"IPSurveillance", Name: 'IP Surveillance', FileName: 'ipsurveillance.xml' },
    { Key:"MEGASYS", Name: 'MegaSys', FileName: 'megasys.xml' },
    { Key:"MESSOA", Name: 'Messoa', FileName: 'messoa.xml' },
    { Key:"MOBOTIX", Name: 'MOBOTIX', FileName: 'mobotix.xml' },
    { Key:"NEXCOM", Name: 'NEXCOM', FileName: 'nexcom.xml' },
    { Key:"ONVIF", Name: 'ONVIF', FileName: 'onvif.xml' },
    { Key:"PANASONIC", Name: 'Panasonic', FileName: 'panasonic.xml' },
    { Key:"PULSE", Name: 'PULSE', FileName: 'pulse.xml' },
    { Key:"SAMSUNG", Name: 'SAMSUNG', FileName: 'samsung.xml' },
    { Key:"SIEMENS", Name: 'SIEMENS', FileName: 'siemens.xml' },
    { Key:"SONY", Name: 'SONY', FileName: 'sony.xml' },
    // { Name: 'Stretch', FileName: 'stretch.xml' },
    { Key:"SURVEON", Name: 'Surveon', FileName: 'surveon.xml' },
    { Key:"VIGZUL", Name: 'VIGZUL', FileName: 'vigzul.xml' },
    { Key:"VIVOTEK", Name: 'VIVOTEK', FileName: 'vivotek.xml' },
    { Key:"XTS", Name: 'XTS Corp.', FileName: 'xts.xml' },
    { Key:"YUAN", Name: 'YUAN', FileName: 'yuan.xml' },
    { Key:"ZAVIO", Name: 'ZAVIO', FileName: 'zavio.xml' },
    { Key:"ZEROONE", Name: 'ZeroOne', FileName: 'zeroone.xml' },
];
/** 若Capability中的DeviceType屬於此處列舉，則代表需要填寫Aspect Ratio Correction */
export const AspectRatioCorrectionModelType: string[] = [
    'videoserver', 'ipboxcamera'
];
// 這些ModelType都需要填寫Dewarp Type欄位
export const DewarpTypeModelType: string[] = [
    'fisheye', 'ipboxcamera', 'ptz dome network camera', 'megapixelipdome', 'megaivaboxipcamera', 'megapixelcamera', 'camera', 'ptzcamera',
    'fixed', 'ptz', 'hd network camera', 'badge', 'megavideoipcamera', 'mega-pixel network camera', 'videoserver'
];
/** 這些brand都需要選填ResolutionMode */
export const ResolutionModeBrand: string[] = [
    'arecontvision'
];
// 這些brand都需要填寫Seamless Edge Recording欄位
export const SeamlessEdgeRecordingBrand: string[] = [
    'a-mtk', 'axis', 'certis', 'dynacolor', 'panasonic', 'sony', 'vivotek'
];
export const ProfileModes = [
    { key: 'Single Stream', value: '1'},
    { key: 'Dual Stream', value: '2'},
    { key: 'Triple Stream', value: '3'},
    { key: 'Multi Stream', value: '4'},
    // { key: 'Quad', value: '5'}, // Axis Q6000-E, Q7424-R MK II
    { key: 'Five', value: '5'}
];
export const QuadSpecialModel = [
    'Q7424-R MK II', 'Q6000-E'
];
export const OccupancyPriorityList = [
    { key: 'Predecessor', value: '0'},
    { key: 'Successor', value: '1'},
];
export const BitrateControlBrand: string[] = [
    'arecontvision'
];
export const MotionThresholdBrand: string[] = [
    'arecontvision'
];
export const ResolutionRegionBrand: string[] = [
    'arecontvision'
];
export const QualityBrand: string[] = [
    'bosch'
];
export const PTZAction = [
    'Up', 'Down', 'Left', 'Right', 'Top Left', 'Down Left', 'Top Right', 'Down Right',
    'Stop', 'Zoom In', 'Zoom Out', 'Zoom Stop', 'Focus In', 'Focus Out', 'Focus Stop'
];
