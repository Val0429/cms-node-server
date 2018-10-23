export interface IDeviceVendor {
    Name: string;
    FileName: string;
}
export const DeviceVendor: IDeviceVendor[] = [
    { Name: 'ACTi', FileName: 'acti.xml' },
    { Name: 'A-MTK', FileName: 'amtk.xml' },
    { Name: 'ArecontVision', FileName: 'arecontvision.xml' },
    { Name: 'Avigilon', FileName: 'avigilon.xml' },
    { Name: 'Axis', FileName: 'axis.xml' },
    { Name: 'BOSCH', FileName: 'bosch.xml' },
    { Name: 'Brickcom', FileName: 'brickcom.xml' },
    { Name: 'Certis', FileName: 'certis.xml' },
    { Name: 'Customization', FileName: 'customization.xml' },
    { Name: 'Dahua', FileName: 'dahua.xml' },
    { Name: 'DivioTec', FileName: 'diviotec.xml' },
    { Name: 'D-Link', FileName: 'dlink.xml' },
    { Name: 'Dynacolor', FileName: 'dynacolor.xml' },
    { Name: 'ETROVISION', FileName: 'etrovision.xml' },
    { Name: 'EverFocus', FileName: 'everfocus.xml' },
    { Name: 'FINE', FileName: 'fine.xml' },
    { Name: 'GoodWill', FileName: 'goodwill.xml' },
    { Name: 'HIKVISION', FileName: 'hikvision.xml' },
    { Name: 'inskytec', FileName: 'inskytec.xml' },
    // { Name: 'iSapSolution', FileName: 'isapsolution.xml' },
    { Name: 'IP Surveillance', FileName: 'ipsurveillance.xml' },
    { Name: 'MegaSys', FileName: 'megasys.xml' },
    { Name: 'Messoa', FileName: 'messoa.xml' },
    { Name: 'MOBOTIX', FileName: 'mobotix.xml' },
    { Name: 'NEXCOM', FileName: 'nexcom.xml' },
    { Name: 'ONVIF', FileName: 'onvif.xml' },
    { Name: 'Panasonic', FileName: 'panasonic.xml' },
    { Name: 'PULSE', FileName: 'pulse.xml' },
    { Name: 'SAMSUNG', FileName: 'samsung.xml' },
    { Name: 'SIEMENS', FileName: 'siemens.xml' },
    { Name: 'SONY', FileName: 'sony.xml' },
    // { Name: 'Stretch', FileName: 'stretch.xml' },
    { Name: 'Surveon', FileName: 'surveon.xml' },
    { Name: 'VIGZUL', FileName: 'vigzul.xml' },
    { Name: 'VIVOTEK', FileName: 'vivotek.xml' },
    { Name: 'XTS Corp.', FileName: 'xts.xml' },
    { Name: 'YUAN', FileName: 'yuan.xml' },
    { Name: 'ZAVIO', FileName: 'zavio.xml' },
    { Name: 'ZeroOne', FileName: 'zeroone.xml' },
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
