import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { IServerInfoStorage, IMediaDiskspace } from 'lib/domain/core';
import { ServerInfo } from 'app/model/core';
import ArrayHelper from 'app/helper/array.helper';
import MediaDiskHelper from 'app/helper/media-disk.helper';

@Component({
  selector: 'app-storage',
  templateUrl: './storage.component.html',
  styleUrls: ['./storage.component.css']
})
export class StorageComponent implements OnInit {
  recordServerList: ServerInfo[];
  diskInfos: {
    server: ServerInfo;
    disks: IMediaDiskspace[];
  }[];
  currentEditServer: ServerInfo;
  currentEditStorageIndex: number;
  overviewType = 'RecordServer';

  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    this.reloadServerInfo();
  }

  reloadServerInfo() {
    this.recordServerList = undefined;
    this.currentEditServer = undefined;
    this.currentEditStorageIndex = undefined;
    this.parseService.fetchData({
      type: ServerInfo,
      filter: query => query.matches('Type', new RegExp(this.overviewType), 'i')
    }).then(serverInfos => {
      this.recordServerList = serverInfos;
      this.updateConnectionStatus();
    });
  }

  /** 檢查每台RecordServer是否可連線 */
  updateConnectionStatus() {
    if (!this.recordServerList) {
      return;
    }
    this.diskInfos = [];
    this.recordServerList.forEach(server => {
      this.coreService.proxyMediaServer({
        method: 'GET',
        path: this.coreService.urls.URL_MEDIA_DISKSPACE,
        domainPath: `http://${server.Domain}:${server.Port}`
      }).map(result => {
        this.diskInfos.push({
          server: server,
          disks: result.DiskInfo.Disk ? ArrayHelper.toArray(result.DiskInfo.Disk) : []
        });
      }).subscribe();
    });
  }

  getServerStatus(server: ServerInfo, storage: IServerInfoStorage) {
    if (!this.diskInfos) {
      return undefined;
    }

    const disk = this.getDiskspaceFromStorage(server, storage);
    return disk ? true : false;
  }

  getPathDrive(path: string) {
    return path.split(':')[0];
  }

  /** 透過ServerInfo中紀錄的Path取得該Server目前實際disk資訊 */
  getDiskspaceFromStorage(server: ServerInfo, storage: IServerInfoStorage) {
    const serverInfo = this.diskInfos.find(x => x.server === server);
    if (!serverInfo || !serverInfo.disks) {
      return undefined;
    }
    return serverInfo.disks.find(x => this.getPathDrive(x.Letter) === this.getPathDrive(storage.Path));
  }

  /** 計算硬碟總量 */
  getCapacity(server: ServerInfo, storage: IServerInfoStorage) {
    const disk = this.getDiskspaceFromStorage(server, storage);
    if (!disk) {
      return MediaDiskHelper.countBytes('0');
    }
    return MediaDiskHelper.countBytes(disk.TotalBytes);
  }

  /** 計算硬碟可用量 */
  getFreeSpace(server: ServerInfo, storage: IServerInfoStorage) {
    const disk = this.getDiskspaceFromStorage(server, storage);
    if (!disk) {
      return MediaDiskHelper.countBytes('0');
    }
    return MediaDiskHelper.countBytes(disk.FreeBytes);
  }

  /** 計算硬碟使用量 */
  countUsageSpace(server: ServerInfo, storage: IServerInfoStorage) {
    const disk = this.getDiskspaceFromStorage(server, storage);
    return MediaDiskHelper.countUsageSpace(disk);
  }

  /** 計算硬碟使用量百分比 */
  countUsagePercent(server: ServerInfo, storage: IServerInfoStorage): string {
    const disk = this.getDiskspaceFromStorage(server, storage);
    return MediaDiskHelper.countUsagePercent(disk);
  }

  clickEditStorage(server: ServerInfo, storageIndex: number) {
    this.currentEditServer = server;
    this.currentEditStorageIndex = storageIndex;
  }
}
