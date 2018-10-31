import { INvr, IEvent, ISysLog, IServer, IServerInfo, IDBSync, IDBSyncDestination } from '../../../lib/domain/core';
// import { IHost, IHostEvent, IVisitEvent, IVisitor } from 'lib/domain/core';
import * as Parse from 'parse/node';

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
