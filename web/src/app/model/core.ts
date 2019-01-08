import {
  IGeneral,
  IServerInfo,
  IServer,
  IServerStorage,
  INvr,
  IUserGroup,
  IServerInfoStorage,
  IDevice,
  IDeviceConfig,
  IGroup,
  IParsePointer,
  IRecordScheduleTemplate,
  IRecordSchedule,
  IEventScheduleTemplate,
  IEvent,
  IEventHandler,
  IEventHandlerType,
  ISysLog,
  IDBSync,
  IDBSyncDestination,
  IEventRecovery,
  IEventRecoverySetting,
  IRecordScheduleTemplateFullRecord,
  IRecordScheduleTemplateEventRecord,
} from 'lib/domain/core';
// import * as parse from 'parse';

export class RoleType {
  static ADMINISTRATOR = 'Administrator';
  static SUPERUSER = 'Superuser';
  static USER = 'User';
  static GUEST = 'Guest';
}

export class UserGroup extends Parse.Object implements IUserGroup {
  get Name(): string {
    return super.get('Name');
  }
  set Name(value: string) {
    super.set('Name', value);
  }
  get Id(): string {
    return super.get('Id');
  }
  set Id(value: string) {
    super.set('Id', value);
  }
  get Description(): string {
    return super.get('Description');
  }
  set Description(value: string) {
    super.set('Description', value);
  }
  get Page(): { Name: string; Permission: string[] }[] {
    return super.get('Page');
  }
  set Page(value: { Name: string; Permission: string[] }[]) {
    super.set('Page', value);
  }
  constructor(value?: Partial<IUserGroup>) {
    super('UserGroup');
    Object.assign(this, value);
  }
}

export class Group extends Parse.Object implements IGroup {
  get Name(): string {
    return super.get('Name');
  }
  set Name(value: string) {
    super.set('Name', value);
  }
  get Level(): string {
    return super.get('Level');
  }
  set Level(value: string) {
    super.set('Level', value);
  }
  get SubGroup(): string[] {
    return super.get('SubGroup');
  }
  set SubGroup(value: string[]) {
    super.set('SubGroup', value);
  }
  get Nvr(): string[] {
    return super.get('Nvr');
  }
  set Nvr(value: string[]) {
    super.set('Nvr', value);
  }
  get Channel(): {
    Nvr: string;
    Channel: number;
  }[] {
    return super.get('Channel');
  }
  set Channel(
    value: {
      Nvr: string;
      Channel: number;
    }[],
  ) {
    super.set('Channel', value);
  }
  constructor(value?: Partial<IGroup>) {
    super('Group');
    Object.assign(this, value);
  }
}

export class Nvr extends Parse.Object implements INvr {
  get Name(): string {
    return super.get('Name');
  }
  set Name(value: string) {
    super.set('Name', value);
  }
  get SequenceNumber(): number {
    return super.get('SequenceNumber');
  }
  set SequenceNumber(value: number) {
    super.set('SequenceNumber', value);
  }
  get Id(): string {
    return super.get('Id');
  }
  set Id(value: string) {
    super.set('Id', value);
  }
  get Driver(): string {
    return super.get('Driver');
  }
  set Driver(value: string) {
    super.set('Driver', value);
  }
  get Manufacture(): string {
    return super.get('Manufacture');
  }
  set Manufacture(value: string) {
    super.set('Manufacture', value);
  }
  get Domain(): string {
    return super.get('Domain');
  }
  set Domain(value: string) {
    super.set('Domain', value);
  }
  get Port(): number {
    return super.get('Port');
  }
  set Port(value: number) {
    super.set('Port', value);
  }
  get ServerPort(): number {
    return super.get('ServerPort');
  }
  set ServerPort(value: number) {
    super.set('ServerPort', value);
  }
  get ServerStatusCheckInterval(): number {
    return super.get('ServerStatusCheckInterval');
  }
  set ServerStatusCheckInterval(value: number) {
    super.set('ServerStatusCheckInterval', value);
  }
  get Account(): string {
    return super.get('Account');
  }
  set Account(value: string) {
    super.set('Account', value);
  }
  get Password(): string {
    return super.get('Password');
  }
  set Password(value: string) {
    super.set('Password', value);
  }
  get SSLEnable(): boolean {
    return super.get('SSLEnable');
  }
  set SSLEnable(value: boolean) {
    super.set('SSLEnable', value);
  }
  get IsListenEvent(): boolean {
    return super.get('IsListenEvent');
  }
  set IsListenEvent(value: boolean) {
    super.set('IsListenEvent', value);
  }
  get IsPatrolInclude(): boolean {
    return super.get('IsPatrolInclude');
  }
  set IsPatrolInclude(value: boolean) {
    super.set('IsPatrolInclude', value);
  }
  get BandwidthBitrate(): number {
    return super.get('BandwidthBitrate');
  }
  set BandwidthBitrate(value: number) {
    super.set('BandwidthBitrate', value);
  }
  get BandwidthStream(): number {
    return super.get('BandwidthStream');
  }
  set BandwidthStream(value: number) {
    super.set('BandwidthStream', value);
  }
  get Tags(): string[] {
    return super.get('Tags');
  }
  set Tags(value: string[]) {
    super.set('Tags', value);
  }

  constructor(data?: Partial<INvr>) {
    super('Nvr');
    Object.assign(this, data);
  }
}

export class ServerInfo extends Parse.Object implements IServerInfo {
  get SSLPort(): number {
    return super.get('SSLPort');
  }
  set SSLPort(value: number) {
    super.set('SSLPort', value);
  }
  get TempPath(): string {
    return super.get('TempPath');
  }
  set TempPath(value: string) {
    super.set('TempPath', value);
  }
  get objectId(): string {
    return super.get('objectId');
  }
  set objectId(value: string) {
    super.set('objectId', value);
  }
  get Type(): string {
    return super.get('Type');
  }
  set Type(value: string) {
    super.set('Type', value);
  }
  get SubType(): string {
    return super.get('SubType');
  }
  set SubType(value: string) {
    super.set('SubType', value);
  }
  get Domain(): string {
    return super.get('Domain');
  }
  set Domain(value: string) {
    super.set('Domain', value);
  }
  get Port(): number {
    return super.get('Port');
  }
  set Port(value: number) {
    super.set('Port', value);
  }
  get MaxCapacity(): number {
    return super.get('MaxCapacity');
  }
  set MaxCapacity(value: number) {
    super.set('MaxCapacity', value);
  }
  get Name(): string {
    return super.get('Name');
  }
  set Name(value: string) {
    super.set('Name', value);
  }
  get KeepDays(): {
    Enable: boolean;
    Default: number;
  } {
    return super.get('KeepDays');
  }
  set KeepDays(value: { Enable: boolean; Default: number }) {
    super.set('KeepDays', value);
  }
  get Storage(): IServerInfoStorage[] {
    return super.get('Storage');
  }
  set Storage(value: IServerInfoStorage[]) {
    super.set('Storage', value);
  }
  constructor(value?: Partial<IServerInfo>) {
    super('ServerInfo');
    Object.assign(this, value);
  }
}

export class Server extends Parse.Object implements IServer {
  get Brand(): string {
    return super.get('Brand');
  }
  set Brand(value: string) {
    super.set('Brand', value);
  }
  get ProductNO(): string {
    return super.get('ProductNO');
  }
  set ProductNO(value: string) {
    super.set('ProductNO', value);
  }
  get CheckLicenseMac(): string {
    return super.get('CheckLicenseMac');
  }
  set CheckLicenseMac(value: string) {
    super.set('CheckLicenseMac', value);
  }
  get SupportAchiveServer(): string {
    return super.get('SupportAchiveServer');
  }
  set SupportAchiveServer(value: string) {
    super.set('SupportAchiveServer', value);
  }
  get AP(): { Name: string; Page: { Name: string; Config: string }[] } {
    return super.get('AP');
  }
  set AP(value: { Name: string; Page: { Name: string; Config: string }[] }) {
    super.set('AP', value);
  }
  get Storage(): IServerStorage[] {
    return super.get('Storage');
  }
  set Storage(value: IServerStorage[]) {
    super.set('Storage', value);
  }
  constructor(value?: Partial<IServer>) {
    super('Server');
    Object.assign(this, value);
  }
}

export class RecordScheduleTemplate extends Parse.Object implements IRecordScheduleTemplate {
  get RecordRecover(): boolean {
    return super.get('RecordRecover');
  }
  set RecordRecover(value: boolean) {
    super.set('RecordRecover', value);
  }
  get Name(): string {
    return super.get('Name');
  }
  set Name(value: string) {
    super.set('Name', value);
  }
  get FullRecord(): IRecordScheduleTemplateFullRecord {
    return super.get('FullRecord');
  }
  set FullRecord(value: IRecordScheduleTemplateFullRecord) {
    super.set('FullRecord', value);
  }
  get EventRecord(): IRecordScheduleTemplateEventRecord {
    return super.get('EventRecord');
  }
  set EventRecord(value: IRecordScheduleTemplateEventRecord) {
    super.set('EventRecord', value);
  }
  get Recorder(): ServerInfo {
    return super.get('Recorder');
  }
  set Recorder(value: ServerInfo) {
    super.set('Recorder', value);
  }
  get KeepDays(): string {
    return super.get('KeepDays');
  }
  set KeepDays(value: string) {
    super.set('KeepDays', value);
  }
  constructor(value?: Partial<IRecordScheduleTemplate>) {
    super('RecordScheduleTemplate');
    Object.assign(this, value);
  }
}

export class RecordSchedule extends Parse.Object implements IRecordSchedule {
  get NvrId(): string {
    return super.get('NvrId');
  }
  set NvrId(value: string) {
    super.set('NvrId', value);
  }
  get ChannelId(): number {
    return super.get('ChannelId');
  }
  set ChannelId(value: number) {
    super.set('ChannelId', value);
  }
  get StreamId(): number {
    return super.get('StreamId');
  }
  set StreamId(value: number) {
    super.set('StreamId', value);
  }
  get ScheduleTemplate(): RecordScheduleTemplate {
    return super.get('ScheduleTemplate');
  }
  set ScheduleTemplate(value: RecordScheduleTemplate) {
    super.set('ScheduleTemplate', value);
  }
  constructor(value?: Partial<IRecordSchedule>) {
    super('RecordSchedule');
    Object.assign(this, value);
  }
}

export class Event extends Parse.Object implements IEvent {
  get Type(): string {
    return super.get('Type');
  }
  set Type(value: string) {
    super.set('Type', value);
  }
  get NvrId(): string {
    return super.get('NvrId');
  }
  set NvrId(value: string) {
    super.set('NvrId', value);
  }
  get ChannelId(): number {
    return super.get('ChannelId');
  }
  set ChannelId(value: number) {
    super.set('ChannelId', value);
  }
  get Time(): number {
    return super.get('Time');
  }
  set Time(value: number) {
    super.set('Time', value);
  }
  get DeviceId(): number {
    return super.get('DeviceId');
  }
  set DeviceId(value: number) {
    super.set('DeviceId', value);
  }
  get Status(): string {
    return super.get('Status');
  }
  set Status(value: string) {
    super.set('Status', value);
  }
  constructor(value?: Partial<IEvent>) {
    super('Event');
    Object.assign(this, value);
  }
}

export class EventScheduleTemplate extends Parse.Object implements IEventScheduleTemplate {
  get Name(): string {
    return super.get('Name');
  }
  set Name(value: string) {
    super.set('Name', value);
  }
  get Schedule(): string {
    return super.get('Schedule');
  }
  set Schedule(value: string) {
    super.set('Schedule', value);
  }
  constructor(value?: Partial<IEventScheduleTemplate>) {
    super('EventScheduleTemplate');
    Object.assign(this, value);
  }
}

export class EventHandler extends Parse.Object implements IEventHandler {
  get NvrId(): string {
    return super.get('NvrId');
  }
  set NvrId(value: string) {
    super.set('NvrId', value);
  }
  get DeviceId(): number {
    return super.get('DeviceId');
  }
  set DeviceId(value: number) {
    super.set('DeviceId', value);
  }
  get Schedule(): string {
    return super.get('Schedule');
  }
  set Schedule(value: string) {
    super.set('Schedule', value);
  }
  get EventHandler(): IEventHandlerType[] {
    return super.get('EventHandler');
  }
  set EventHandler(value: IEventHandlerType[]) {
    super.set('EventHandler', value);
  }
  constructor(value?: Partial<IEventHandler>) {
    super('EventHandler');
    Object.assign(this, value);
  }
}

export class EventRecovery extends Parse.Object implements IEventRecovery {
  get Event(): IEventRecoverySetting {
    return super.get('Event');
  }
  set Event(value: IEventRecoverySetting) {
    super.set('Event', value);
  }
  get SystemLog(): IEventRecoverySetting {
    return super.get('SystemLog');
  }
  set SystemLog(value: IEventRecoverySetting) {
    super.set('SystemLog', value);
  }
  get OperationLog(): IEventRecoverySetting {
    return super.get('OperationLog');
  }
  set OperationLog(value: IEventRecoverySetting) {
    super.set('OperationLog', value);
  }
  constructor(value?: Partial<IEventRecovery>) {
    super('EventRecovery');
    Object.assign(this, value);
  }
}

export class Device extends Parse.Object implements IDevice {
  
  objectId:string;

  get NvrId(): string {
    return super.get('NvrId');
  }
  set NvrId(value: string) {
    super.set('NvrId', value);
  }
  get Name(): string {
    return super.get('Name');
  }
  set Name(value: string) {
    super.set('Name', value);
  }
  get Channel(): number {
    return super.get('Channel');
  }
  set Channel(value: number) {
    super.set('Channel', value);
  }
  get Config(): IDeviceConfig {
    return super.get('Config');
  }
  set Config(value: IDeviceConfig) {
    super.set('Config', value);
  }
  get Capability(): any {
    return super.get('Capability');
  }
  set Capability(value: any) {
    super.set('Capability', value);
  }
  get CameraSetting(): any {
    return super.get('CameraSetting');
  }
  set CameraSetting(value: any) {
    super.set('CameraSetting', value);
  }
  get Tags(): string[] {
    return super.get('Tags');
  }
  set Tags(value: string[]) {
    super.set('Tags', value);
  }
  constructor(value?: Partial<IDevice>) {
    super('Device');
    Object.assign(this, value);
  }
}

export class General extends Parse.Object implements IGeneral {
  get EnableJoystick(): string {
    return super.get('EnableJoystick');
  }
  set EnableJoystick(value: string) {
    super.set('EnableJoystick', value);
  }
  get EnableAxisJoystick(): string {
    return super.get('EnableAxisJoystick');
  }
  set EnableAxisJoystick(value: string) {
    super.set('EnableAxisJoystick', value);
  }
  get StartupOptions(): IGeneralStartupOptions {
    return super.get('StartupOptions');
  }
  set StartupOptions(value: IGeneralStartupOptions) {
    super.set('StartupOptions', value);
  }
  get EnableAutoSwitchLiveStream(): string {
    return super.get('EnableAutoSwitchLiveStream');
  }
  set EnableAutoSwitchLiveStream(value: string) {
    super.set('EnableAutoSwitchLiveStream', value);
  }
  get EnableAutoSwitchPlaybackStream(): string {
    return super.get('EnableAutoSwitchPlaybackStream');
  }
  set EnableAutoSwitchPlaybackStream(value: string) {
    super.set('EnableAutoSwitchPlaybackStream', value);
  }
  get EnableAutoSwitchDecodeIFrame(): string {
    return super.get('EnableAutoSwitchDecodeIFrame');
  }
  set EnableAutoSwitchDecodeIFrame(value: string) {
    super.set('EnableAutoSwitchDecodeIFrame', value);
  }
  get StorageAlert(): string {
    return super.get('StorageAlert');
  }
  set StorageAlert(value: string) {
    super.set('StorageAlert', value);
  }
  get Ftp(): IGeneralFtp {
    return super.get('Ftp');
  }
  set Ftp(value: IGeneralFtp) {
    super.set('Ftp', value);
  }
  get DisplayNVRId(): string {
    return super.get('DisplayNVRId');
  }
  set DisplayNVRId(value: string) {
    super.set('DisplayNVRId', value);
  }
  get SaveImagePath(): string {
    return super.get('SaveImagePath');
  }
  set SaveImagePath(value: string) {
    super.set('SaveImagePath', value);
  }
  get ExportVideoPath(): string {
    return super.get('ExportVideoPath');
  }
  set ExportVideoPath(value: string) {
    super.set('ExportVideoPath', value);
  }
  get Watermark(): IGeneralWatermark {
    return super.get('Watermark');
  }
  set Watermark(value: IGeneralWatermark) {
    super.set('Watermark', value);
  }
  get AutoSwitchPlaybackLowProfileCount(): string {
    return super.get('AutoSwitchPlaybackLowProfileCount');
  }
  set AutoSwitchPlaybackLowProfileCount(value: string) {
    super.set('AutoSwitchPlaybackLowProfileCount', value);
  }
  get AutoSwitchPlaybackHighProfileCount(): string {
    return super.get('AutoSwitchPlaybackHighProfileCount');
  }
  set AutoSwitchPlaybackHighProfileCount(value: string) {
    super.set('AutoSwitchPlaybackHighProfileCount', value);
  }
  get AutoSwitchLiveLowProfileCount(): string {
    return super.get('AutoSwitchLiveLowProfileCount');
  }
  set AutoSwitchLiveLowProfileCount(value: string) {
    super.set('AutoSwitchLiveLowProfileCount', value);
  }
  get AutoSwitchLiveHighProfileCount(): string {
    return super.get('AutoSwitchLiveHighProfileCount');
  }
  set AutoSwitchLiveHighProfileCount(value: string) {
    super.set('AutoSwitchLiveHighProfileCount', value);
  }
  get AutoSwitchDecodeIFrameCount(): string {
    return super.get('AutoSwitchDecodeIFrameCount');
  }
  set AutoSwitchDecodeIFrameCount(value: string) {
    super.set('AutoSwitchDecodeIFrameCount', value);
  }
  get StretchLiveVideo(): string {
    return super.get('StretchLiveVideo');
  }
  set StretchLiveVideo(value: string) {
    super.set('StretchLiveVideo', value);
  }
  get StretchPlaybackVideo(): string {
    return super.get('StretchPlaybackVideo');
  }
  set StretchPlaybackVideo(value: string) {
    super.set('StretchPlaybackVideo', value);
  }
  get EnableBandwidthControl(): string {
    return super.get('EnableBandwidthControl');
  }
  set EnableBandwidthControl(value: string) {
    super.set('EnableBandwidthControl', value);
  }
  get AutoLockApplicationTimer(): string {
    return super.get('AutoLockApplicationTimer');
  }
  set AutoLockApplicationTimer(value: string) {
    super.set('AutoLockApplicationTimer', value);
  }
  get ExportFileNameFormat(): string {
    return super.get('ExportFileNameFormat');
  }
  set ExportFileNameFormat(value: string) {
    super.set('ExportFileNameFormat', value);
  }
  get KeepLastFrame(): string {
    return super.get('KeepLastFrame');
  }
  set KeepLastFrame(value: string) {
    super.set('KeepLastFrame', value);
  }
  get DisplayDeviceId(): string {
    return super.get('DisplayDeviceId');
  }
  set DisplayDeviceId(value: string) {
    super.set('DisplayDeviceId', value);
  }
  get ImageWithTimestamp(): string {
    return super.get('ImageWithTimestamp');
  }
  set ImageWithTimestamp(value: string) {
    super.set('ImageWithTimestamp', value);
  }
  get SaveImageFormat(): string {
    return super.get('SaveImageFormat');
  }
  set SaveImageFormat(value: string) {
    super.set('SaveImageFormat', value);
  }
  get VideoTitleBar(): IGeneralVideoTitleBar {
    return super.get('VideoTitleBar');
  }
  set VideoTitleBar(value: IGeneralVideoTitleBar) {
    super.set('VideoTitleBar', value);
  }
  get Mail(): IGeneralMail {
    return super.get('Mail');
  }
  set Mail(value: IGeneralMail) {
    super.set('Mail', value);
  }
  get CPULoadingUpperBoundary(): string {
    return super.get('CPULoadingUpperBoundary');
  }
  set CPULoadingUpperBoundary(value: string) {
    super.set('CPULoadingUpperBoundary', value);
  }
  get DisplayGroupId(): string {
    return super.get('DisplayGroupId');
  }
  set DisplayGroupId(value: string) {
    super.set('DisplayGroupId', value);
  }
  get LastPictureEnabled(): string {
    return super.get('LastPictureEnabled');
  }
  set LastPictureEnabled(value: string) {
    super.set('LastPictureEnabled', value);
  }
  get LivePatrolInterval(): string {
    return super.get('LivePatrolInterval');
  }
  set LivePatrolInterval(value: string) {
    super.set('LivePatrolInterval', value);
  }
  constructor(value?: Partial<IGeneral>) {
    super('General');
    Object.assign(this, value);
  }
}

export class SysLog extends Parse.Object implements ISysLog {
  get ServerName(): string {
    return super.get('ServerName');
  }
  set ServerName(value: string) {
    super.set('ServerName', value);
  }
  get Type(): string {
    return super.get('Type');
  }
  set Type(value: string) {
    super.set('Type', value);
  }
  get Time(): number {
    return super.get('Time');
  }
  set Time(value: number) {
    super.set('Time', value);
  }
  get Description(): string {
    return super.get('Description');
  }
  set Description(value: string) {
    super.set('Description', value);
  }
  constructor(value?: Partial<ISysLog>) {
    super('SysLog');
    Object.assign(this, value);
  }
}

export class DBSync extends Parse.Object implements IDBSync {
  get autoSync(): boolean {
    return super.get('autoSync');
  }
  set autoSync(value: boolean) {
    super.set('autoSync', value);
  }
  get destination(): IDBSyncDestination[] {
    return super.get('destination');
  }
  set destination(value: IDBSyncDestination[]) {
    super.set('destination', value);
  }
  constructor(data?: Partial<IDBSync>) {
    super('DBSync');
    Object.assign(this, data);
  }
}

interface IGeneralStartupOptions {
  Enabled: string; // default 'true'
  VideoTitleBar: string; // default 'true'
  FullScreen: string; // default 'false'
  HidePanel: string; // default 'false'
  TotalBitrate: string; // default '-1'
  Patrol: string; // default 'false'
  View: string; // default '1'
}

interface IGeneralFtp {
  Server: string;
  Directory: string;
  Port: string;
  Account: string;
  Password: string;
}

interface IGeneralWatermark {
  FontFamily: string; // default 'Arial',
  FontSize: string; // default '8'
  FontColor: string; // default '#FFFFFF',
  Text: string; // default 'iSapSolution'
}

interface IGeneralVideoTitleBar {
  Informations: { Seq: string; Type: string }[]; // ex: { Seq: '1', Type: 'Resolution' }
  FontFamily: string; // default 'Arial'
  FontSize: string; // default '8'
  FontColor: string; // default '#FFFFFF'
  BackgroundColor: string; // default '#0000FF'
}

interface IGeneralMail {
  Security: string; // default 'PLAIN'
  Port: string; // default empty
  Sender: string; // default empty
  MailAddress: string; // default empty
  Server: string; // default empty
  Account: string; // default empty
  Password: string; // default empty
}
