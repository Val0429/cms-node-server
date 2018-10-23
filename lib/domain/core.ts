export interface INvr {
    Name: string,
    Id: string,
    Driver: string,
    Manufacture: string,
    Domain: string,
    Port: number,
    ServerPort: number,
    ServerStatusCheckInterval: number,
    Account: string,
    Password: string,
    SSLEnable: boolean,
    IsListenEvent: boolean,
    IsPatrolInclude: boolean,
    BandwidthBitrate: number,
    BandwidthStream: number,
    Tags: string[]
}

export interface IEvent {
    Type: string,
    NvrId: string,
    ChannelId: number,
    Time: number,
    DeviceId: number,
    Status: string
}

export interface ISysLog {
    ServerName: string,
    Type: string,
    Time: number,
    Description: string
}

export interface IServer {
    Brand: string,
    ProductNO: string,
    CheckLicenseMac: string,
    SupportAchiveServer: string,
    AP: {
        Name: string,
        Page: {
            Name: string,
            Config: string
        }[]
    },
    Storage: IServerStorage[]
}

export interface IServerInfo {
    Type: string,
    SubType: string,
    Domain: string,
    Port: number,
    MaxCapacity: number,
    Name: string,
    KeepDays: {
        Enable: boolean,
        Default: number
    },
    Storage: {
        Name: string,
        Path: string,
        KeepSpace: number,
    }[]
}

export interface IUserGroup {
    Name: string,
    Id: string,
    Description: string,
    Page: {
        Name: string,
        Permission: string[]
    }[]
}

export interface IServerInfoStorage {
    Name: string,
    Path: string,
    KeepSpace: number
}

/** MediaServer回傳的LicenseInfo */
export interface ILicenseInfo {
    Adaptor: ILicenseAdaptor[],
    Maximun: string
}

export interface ILicenseAdaptor {
    Description: string,
    IP: string,
    MAC: string,
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
    }[]
}

export interface IDevice {
    NvrId: string;
    Channel: number;
    Name: string;
    Capability: any;
    Config: IDeviceConfig;
    CameraSetting: any;
    Tags: string[];
}

export interface IDeviceConfig {
    Brand?: string;
    Model?: string;
    Name?: string;
    IPAddress?: string;
    Http?: number;
    Authentication?: {
        Account: string;
        Password: string;
        Encryption: string;
        OccupancyPriority: number;
    }
    PTZSupport?: {
        Pan: string;
        Tilt: string;
        Zoom: string;
    }
    'Multi-Stream'?: {
        High: number;
        Medium: number;
        Low: number;
    }
    Stream?: IDeviceStream[];
}

export interface IDeviceStream {
    Id: number;
    Video: {
        ResolutionScale: string;
        Encode: string;
        Width: number;
        Height: number;
        Fps: number;
        Bitrate: number;
        ChannelId: number;
        Quality?: number;
        /** 編輯時才作為選項使用的屬性，不會儲存於DB */
        Resolution?: string;
        /** IPCamera only */
        Protocol?: string;
        /** IPCamera only */
        DewarpMode?: string;
        BitrateControl?: string;
        MotionThreshold?: number;
        /** ArecontVision only */
        RegionStartPointX?: number;
        RegionStartPointY?: number;
    };
    Port: {
        RTSP?: number;
        Stream?: number;
        Control?: number;
        Https?: number;
    };
    /** IPCamera brand:BOSCH only */
    ProfileMode?: number;
    /** CMS server負責填寫, config tool不理會 */
    RTSPURI?: string;
    /** IPCamera RTSP only */
    RecorderId?: string;
    /** IPCamera RTSP only */
    RecordPathId?: string;
    /** IPCamera RTSP only */
    KeepDays?: string;
}

export interface IGroup {
    Name: string;
    Level: string;
    SubGroup?: string[]; // sub group objectId
    Nvr?: string[]; // Nvr.Id
    Channel?: { // IP Camera, Nvr always be 0
        Nvr: string;
        Channel: number;
    }[];
}

export interface IParsePointer {
    __type: string;
    className: string;
    objectId: string;
}

export interface IRecordScheduleTemplate {
    Name: string;
    FullRecord: any;
    EventRecord: any;
    Recorder: IServerInfo;
    KeepDays: string;
}

export interface IRecordSchedule {
    NvrId: string;
    ChannelId: number;
    StreamId: number;
    ScheduleTemplate: IRecordScheduleTemplate;
}

export interface IEventScheduleTemplate {
    Name: string;
    Schedule: string;
}

export interface IEventHandler {
    NvrId: string;
    DeviceId: number;
    Schedule: string;
    EventHandler: IEventHandlerType[];
}

export interface IEventHandlerType {
    EventType: string;
    Id: string;
    Value: string;
    Trigger: string;
    Interval: string;
    Action: any[];
}

export interface IEventRecovery {
    Event: IEventRecoverySetting;
    SystemLog: IEventRecoverySetting;
    OperationLog: IEventRecoverySetting;
}

export interface IEventRecoverySetting {
    Enable: boolean;
    Auto: boolean;
    Schedule: string;
}

export interface IServerStorage {
    Keepspace: string;
    Path: string;
}

export interface IMediaDiskspace {
    FreeBytes: string;
    Label: string;
    Letter: string;
    TotalBytes: string;
}

/** License統計用資料結構 */
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

export interface ISearchCamera {
    COMPANY: string;
    HOSTNAME: string;
    WANIP: string;
    MAC: string;
    HTTPPORT: string;
    PRODUCTIONID: string;
}

export interface IGeneral {
    EnableJoystick: string; // default 'false'
    EnableAxisJoystick: string; // default 'false'
    StartupOptions: any;
    EnableAutoSwitchPlaybackStream: string;
    EnableAutoSwitchDecodeIFrame: string; // default 'false'
    StorageAlert: string;
    Ftp: any;
    DisplayNVRId: string;
    SaveImagePath: string;
    ExportVideoPath: string;
    Watermark: any;
    AutoSwitchPlaybackLowProfileCount: string; // default '9'
    AutoSwitchPlaybackHighProfileCount: string; // default '4'
    AutoSwitchLiveLowProfileCount: string; // default '9'
    AutoSwitchLiveHighProfileCount: string; // default '4'
    AutoSwitchDecodeIFrameCount: string; // default '4'
    StretchLiveVideo: string; // default 'true'
    StretchPlaybackVideo: string; // default 'false'
    EnableBandwidthControl: string; // default 'true'
    AutoLockApplicationTimer: string; // default '0'
    ExportFileNameFormat: string; // default 'S:yyyyMMdd_S:HHmmss_E:HHmmss'
    KeepLastFrame: string; // default 'false'
    DisplayDeviceId: string; // default 'true'
    ImageWithTimestamp: string; // default 'true'
    SaveImageFormat: string; // default 'jpg'
    VideoTitleBar: any;
    Mail: any;
    CPULoadingUpperBoundary: string; // default '95'
    DisplayGroupId: string; // default 'false'
    LastPictureEnabled: string; // default 'false'
    LivePatrolInterval: string; // default '60'
}

export interface IDBSync {
    autoSync: boolean;
    destination: IDBSyncDestination[]
}

export interface IDBSyncDestination {
    ip: string,
    port: number
}
