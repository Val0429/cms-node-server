import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Observable } from 'rxjs/Observable';
import { IServerStorage, IMediaDiskspace, IDBSyncDestination, IRecordPath } from 'lib/domain/core';
import { Server, DBSync, ServerInfo, RecordPath } from 'app/model/core';
import ArrayHelper from 'app/helper/array.helper';
import { Query } from 'parse';

@Component({
  selector: 'app-server',
  templateUrl: './server.component.html',
  styleUrls: ['./server.component.css']
})
export class ServerComponent implements OnInit {
  
  flag = {
    busy: false
  };
  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
   
  }
  

}
