import { INvr, IEvent, ISysLog, IServer, IServerInfo, IDBSync, IDBSyncDestination, IDevice,IDeviceConfig, IGroup, IEventHandlerType, IEventHandler, IRecordScheduleTemplate, IRecordScheduleTemplateFullRecord, IRecordScheduleTemplateEventRecord, IRecordSchedule } from '../../../lib/domain/core';
// import { IHost, IHostEvent, IVisitEvent, IVisitor } from 'lib/domain/core';
import * as Parse from 'parse/node';
export class Device extends Parse.Object implements IDevice {
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

    get Name(): string { return super.get('Name'); }
    set Name(value: string) { super.set('Name', value); }
    get Id(): string { return super.get('Id'); }
    set Id(value: string) { super.set('Id', value); }
    get Driver(): string { return super.get('Driver'); }
    set Driver(value: string) { super.set('Driver', value); }
    get Manufacture(): string { return super.get('Manufacture'); }
    set Manufacture(value: string) { super.set('Manufacture', value); }
    get Domain(): string { return super.get('Domain'); }
    set Domain(value: string) { super.set('Domain', value); }
    get Port(): number { return super.get('Port'); }
    set Port(value: number) { super.set('Port', value); }
    get ServerPort(): number { return super.get('ServerPort'); }
    set ServerPort(value: number) { super.set('ServerPort', value); }
    get ServerStatusCheckInterval(): number { return super.get('ServerStatusCheckInterval'); }
    set ServerStatusCheckInterval(value: number) { super.set('ServerStatusCheckInterval', value); }
    get Account(): string { return super.get('Account'); }
    set Account(value: string) { super.set('Account', value); }
    get Password(): string { return super.get('Password'); }
    set Password(value: string) { super.set('Password', value); }
    get SSLEnable(): boolean { return super.get('SSLEnable'); }
    set SSLEnable(value: boolean) { super.set('SSLEnable', value); }
    get IsListenEvent(): boolean { return super.get('IsListenEvent'); }
    set IsListenEvent(value: boolean) { super.set('IsListenEvent', value); }
    get IsPatrolInclude(): boolean { return super.get('IsPatrolInclude'); }
    set IsPatrolInclude(value: boolean) { super.set('IsPatrolInclude', value); }
    get BandwidthBitrate(): number { return super.get('BandwidthBitrate'); }
    set BandwidthBitrate(value: number) { super.set('BandwidthBitrate', value); }
    get BandwidthStream(): number { return super.get('BandwidthStream'); }
    set BandwidthStream(value: number) { super.set('BandwidthStream', value); }
    get Tags(): string[] { return super.get('Tags'); }
    set Tags(value: string[]) { super.set('Tags', value); }    
    constructor(data?: Partial<INvr>) {
        super('Nvr');
        Object.assign(this, data);
    }
}

export class Event extends Parse.Object implements IEvent {
    get Type(): string { return super.get('Type'); }
    set Type(value: string) { super.set('Type', value); }
    get NvrId(): string { return super.get('NvrId'); }
    set NvrId(value: string) { super.set('NvrId', value); }
    get ChannelId(): number { return super.get('ChannelId'); }
    set ChannelId(value: number) { super.set('ChannelId', value); }
    get Time(): number { return super.get('Time'); }
    set Time(value: number) { super.set('Time', value); }
    get DeviceId(): number { return super.get('DeviceId'); }
    set DeviceId(value: number) { super.set('DeviceId', value); }
    get Status(): string { return super.get('Status'); }
    set Status(value: string) { super.set('Status', value); }
    constructor(data?: Partial<IEvent>) {
        super('Event');
        Object.assign(this, data);
    }
}

export class SysLog extends Parse.Object implements ISysLog {
    get ServerName(): string { return super.get('ServerName'); }
    set ServerName(value: string) { super.set('ServerName', value); }
    get Type(): string { return super.get('Type'); }
    set Type(value: string) { super.set('Type', value); }
    get Time(): number { return super.get('Time'); }
    set Time(value: number) { super.set('Time', value); }
    get Description(): string { return super.get('Description'); }
    set Description(value: string) { super.set('Description', value); }
    constructor(data?: Partial<ISysLog>) {
        super('SysLog');
        Object.assign(this, data);
    }
}

export class Server extends Parse.Object implements IServer {
    get Brand(): string { return super.get('Brand'); }
    set Brand(value: string) { super.set('Brand', value); }
    get ProductNO(): string { return super.get('ProductNO'); }
    set ProductNO(value: string) { super.set('ProductNO', value); }
    get CheckLicenseMac(): string { return super.get('CheckLicenseMac'); }
    set CheckLicenseMac(value: string) { super.set('CheckLicenseMac', value); }
    get SupportAchiveServer(): string { return super.get('SupportAchiveServer'); }
    set SupportAchiveServer(value: string) { super.set('SupportAchiveServer', value); }
    get AP(): {
        Name: string;
        Page: { Name: string; Config: string; }[];
    } { return super.get('AP'); }
    set AP(value: {
        Name: string;
        Page: { Name: string; Config: string; }[];
    }) { super.set('AP', value); }
    get MediaServer(): {
        Port: string; SSLPort: string; DBModule: string; Domain: string;
    } { return super.get('MediaServer'); }
    set MediaServer(value: {
        Port: string; SSLPort: string; DBModule: string; Domain: string;
    }) { super.set('MediaServer', value); }
    get Storage(): {
        Keepspace: string; Path: string;
    }[] { return super.get('Storage'); }
    set Storage(value: {
        Keepspace: string; Path: string;
    }[]) { super.set('Storage', value); }
    constructor(data?: Partial<IServer>) {
        super('Server');
        Object.assign(this, data);
    }
}

export class ServerInfo extends Parse.Object implements IServerInfo {    
    get SSLPort(): number { return super.get('SSLPort'); }
    set SSLPort(value: number) { super.set('SSLPort', value); }

    get TempPath(): string { return super.get('TempPath'); }
    set TempPath(value: string) { super.set('TempPath', value); }
    get Type(): string { return super.get('Type'); }
    set Type(value: string) { super.set('Type', value); }
    get SubType(): string { return super.get('SubType'); }
    set SubType(value: string) { super.set('SubType', value); }
    get Domain(): string { return super.get('Domain'); }
    set Domain(value: string) { super.set('Domain', value); }
    get Port(): number { return super.get('Port'); }
    set Port(value: number) { super.set('Port', value); }
    get MaxCapacity(): number { return super.get('MaxCapacity'); }
    set MaxCapacity(value: number) { super.set('MaxCapacity', value); }
    get Name(): string { return super.get('Name'); }
    set Name(value: string) { super.set('Name', value); }
    get KeepDays(): { Enable: boolean; Default: number; } { return super.get('KeepDays'); }
    set KeepDays(value: { Enable: boolean; Default: number; }) { super.set('KeepDays', value); }
    get Storage(): { Name: string; Path: string; KeepSpace: number; }[] { return super.get('Storage'); }
    set Storage(value: { Name: string; Path: string; KeepSpace: number; }[]) { super.set('Storage', value); }
    constructor(data?: Partial<IServerInfo>) {
        super('ServerInfo');
        Object.assign(this, data);
    }
}

export class DBSync extends Parse.Object implements IDBSync {
    get autoSync(): boolean { return super.get('autoSync'); }
    set autoSync(value: boolean) { super.set('autoSync', value); }
    get destination(): IDBSyncDestination[] { return super.get('destination'); }
    set destination(value: IDBSyncDestination[]) { super.set('destination', value); }
    constructor(data?: Partial<IDBSync>) {
        super('DBSync');
        Object.assign(this, data);
    }
}
