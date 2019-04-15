export const EventConfigs = {
    EventType: {
        Motion: 'Motion', // 0
        DigitalInput: 'DigitalInput', // 1
        DigitalOutput: 'DigitalOutput', // 2
        NetworkLoss: 'ControlPortStop', // 3
        NetworkRecovery: 'ControlPortStart', // 4
        VideoLoss: 'VideoServerVideoLost', // 5
        VideoRecovery: 'VideoServerVideoRecovery', // 6
        RecordFailed: 'RecordFailed', // 7
        RecordRecovery: 'RecordRecovery', // 8
        UserDefine: 'UserDefine', // 9
        ManualRecord: 'ManualRecord', // 10
        CrossLine: 'CrossLine', // 14
        Panic: 'Panic', // 19
        IntrusionDetection: 'IntrusionDetection', // 29
        LoiteringDetection: 'LoiteringDetection', // 30
        ObjectCountingIn: 'ObjectCountingIn', // 31
        ObjectCountingOut: 'ObjectCountingOut', // 32
        AudioDetection: 'AudioDetection', // 34
        TamperDetection: 'TamperDetection', // 35
        FDBRecovery: 'FDBRecovery', // 54
        ZoneCrossing: 'ZoneCrossing', // 64
        ConditionalZoneCrossing: 'ConditionalZoneCrossing', // 65
        LocalDION_0: 'LocalDION_0', // 66
        LocalDION_1: 'LocalDION_1', // 67
        LocalDION_2: 'LocalDION_2', // 68
        LocalDION_3: 'LocalDION_3', // 69
        LocalDION_4: 'LocalDION_4', // 70
        LocalDION_5: 'LocalDION_5', // 71
        LocalDION_6: 'LocalDION_6', // 72
        LocalDION_7: 'LocalDION_7', // 73
        LocalDION_8: 'LocalDION_8', // 74
        LocalDION_9: 'LocalDION_9', // 75
        LocalDION_10: 'LocalDION_10', // 76
        LocalDION_11: 'LocalDION_11', // 77
        LocalDION_12: 'LocalDION_12', // 78
        LocalDION_13: 'LocalDION_13', // 79
        LocalDION_14: 'LocalDION_14', // 80
        LocalDION_15: 'LocalDION_15', // 81
        LocalDIOFF_0: 'LocalDIOFF_0', // 66
        LocalDIOFF_1: 'LocalDIOFF_1', // 67
        LocalDIOFF_2: 'LocalDIOFF_2', // 68
        LocalDIOFF_3: 'LocalDIOFF_3', // 69
        LocalDIOFF_4: 'LocalDIOFF_4', // 70
        LocalDIOFF_5: 'LocalDIOFF_5', // 71
        LocalDIOFF_6: 'LocalDIOFF_6', // 72
        LocalDIOFF_7: 'LocalDIOFF_7', // 73
        LocalDIOFF_8: 'LocalDIOFF_8', // 74
        LocalDIOFF_9: 'LocalDIOFF_9', // 75
        LocalDIOFF_10: 'LocalDIOFF_10', // 76
        LocalDIOFF_11: 'LocalDIOFF_11', // 77
        LocalDIOFF_12: 'LocalDIOFF_12', // 78
        LocalDIOFF_13: 'LocalDIOFF_13', // 79
        LocalDIOFF_14: 'LocalDIOFF_14', // 80
        LocalDIOFF_15: 'LocalDIOFF_15', // 81
        LocalDiskError: 'LocalDiskError', // 98
        PIR: 'PIR', // 101
        RecordResume: 'RecordStart', // 102
        RecordStop: 'RecordStop', // 103
        NVRConnect: 'NVRConnect', // 104
        NVRDisconnect: 'NVRDisconnect', // 105
        StorageSettingNotAvailable: 'StorageSettingNotAvailable', // 106
        SDCardError: 'SDCardError', // 107
        SDCardFull: 'SDCardFull', // 108
        LocalDOON_0: 'LocalDOON_0', // 109
        LocalDOON_1: 'LocalDOON_1', // 110
        LocalDOON_2: 'LocalDOON_2', // 111
        LocalDOON_3: 'LocalDOON_3', // 112
        LocalDOON_4: 'LocalDOON_4', // 113
        LocalDOON_5: 'LocalDOON_5', // 114
        LocalDOON_6: 'LocalDOON_6', // 115
        LocalDOON_7: 'LocalDOON_7', // 116
        LocalDOON_8: 'LocalDOON_8', // 117
        LocalDOON_9: 'LocalDOON_9', // 118
        LocalDOON_10: 'LocalDOON_10', // 119
        LocalDOON_11: 'LocalDOON_11', // 120
        LocalDOON_12: 'LocalDOON_12', // 121
        LocalDOON_13: 'LocalDOON_13', // 122
        LocalDOON_14: 'LocalDOON_14', // 123
        LocalDOON_15: 'LocalDOON_15', // 124
        LocalDOOFF_0: 'LocalDOOFF_0', // 125
        LocalDOOFF_1: 'LocalDOOFF_1', // 126
        LocalDOOFF_2: 'LocalDOOFF_2', // 127
        LocalDOOFF_3: 'LocalDOOFF_3', // 128
        LocalDOOFF_4: 'LocalDOOFF_4', // 129
        LocalDOOFF_5: 'LocalDOOFF_5', // 130
        LocalDOOFF_6: 'LocalDOOFF_6', // 131
        LocalDOOFF_7: 'LocalDOOFF_7', // 132
        LocalDOOFF_8: 'LocalDOOFF_8', // 133
        LocalDOOFF_9: 'LocalDOOFF_9', // 134
        LocalDOOFF_10: 'LocalDOOFF_10', // 135
        LocalDOOFF_11: 'LocalDOOFF_11', // 136
        LocalDOOFF_12: 'LocalDOOFF_12', // 137
        LocalDOOFF_13: 'LocalDOOFF_13', // 138
        LocalDOOFF_14: 'LocalDOOFF_14', // 139
        LocalDOOFF_15: 'LocalDOOFF_15', // 140
        TemperatureDetection: 'TemperatureDetection', // 149
        VideoStop: 'VideoStop', // 160
        VideoStart: 'VideoStart', // 161
        UsbAttach: 'UsbAttach', // 200
        UsbDetach: 'UsbDetach', // 201
        UsbCopyFile: 'UsbCopyFile', // 202
        EmbeddedDigitalInput: 'EmbeddedDigitalInput', // 300
        EmbeddedDigitalOutput: 'EmbeddedDigitalOutput', // 301

        // Local Alarm補完
        WaterSensor: 'WaterSensor',
        ACFailure: 'A/CFailure',
        UPSBatteryLow: 'UPSBatteryLow',
        RackTamperAlarm: 'RackTamperAlarm',
        HeatSensor: 'HeatSensor',

        // Camera Event補完
        AbandonedObject: 'AbandonedObject',
        MissingObject: 'MissingObject',
        UnauthorizedAccess:'UnauthorizedAccess',
        Reboot:'Reboot',
        GracefulShutdown:'GracefulShutdown',
        AbnormalShutdown:'AbnormalShutdown'
    },
    EventActionType: {
        DigitalOut: 'DigitalOut',
        SendMail: 'SendMail',
        UploadFTP: 'UploadFTP',
        Beep: 'Beep',
        Audio: 'Audio',
        ExecCmd: 'ExecCmd',
        PopupLive: 'PopupLive',
        PopupPlayback: 'PopupPlayback',
        HotSpot: 'HotSpot'
    }
};

export const EventDisplaySetup = {
    DisplayIdType: [
        EventConfigs.EventType.Motion,
        EventConfigs.EventType.DigitalInput,
        EventConfigs.EventType.DigitalOutput,
        EventConfigs.EventType.TemperatureDetection
    ],
    DisplayValueType: [
        EventConfigs.EventType.DigitalInput,
        EventConfigs.EventType.DigitalOutput,
    ],
    EventGeneratorLocalAlarmEventType: [
        EventConfigs.EventType.NVRDisconnect,
        EventConfigs.EventType.NVRConnect,
        EventConfigs.EventType.StorageSettingNotAvailable,
        EventConfigs.EventType.LocalDiskError,
        EventConfigs.EventType.WaterSensor,
        EventConfigs.EventType.ACFailure,
        EventConfigs.EventType.UPSBatteryLow,
        EventConfigs.EventType.RackTamperAlarm,
        EventConfigs.EventType.HeatSensor,
    ],
    EventGeneratorCameraEventType: [
        EventConfigs.EventType.DigitalInput,
        EventConfigs.EventType.DigitalOutput,
        EventConfigs.EventType.ManualRecord,
        EventConfigs.EventType.Motion,
        EventConfigs.EventType.Panic,
        EventConfigs.EventType.VideoRecovery,
        EventConfigs.EventType.VideoLoss,
        EventConfigs.EventType.NetworkRecovery,
        EventConfigs.EventType.NetworkLoss,
        EventConfigs.EventType.CrossLine,
        EventConfigs.EventType.IntrusionDetection,
        EventConfigs.EventType.LoiteringDetection,
        EventConfigs.EventType.ObjectCountingIn,
        EventConfigs.EventType.ObjectCountingOut,
        EventConfigs.EventType.AudioDetection,
        EventConfigs.EventType.TamperDetection,
        EventConfigs.EventType.TemperatureDetection,
        EventConfigs.EventType.ZoneCrossing,
        EventConfigs.EventType.ConditionalZoneCrossing,
        EventConfigs.EventType.PIR,
        EventConfigs.EventType.RecordResume,
        EventConfigs.EventType.RecordStop,
        EventConfigs.EventType.SDCardError,
        EventConfigs.EventType.SDCardFull,
        EventConfigs.EventType.VideoStart,
        EventConfigs.EventType.VideoStop,
        EventConfigs.EventType.AbandonedObject,
        EventConfigs.EventType.MissingObject,
    ]
};
