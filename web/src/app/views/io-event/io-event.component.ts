import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Nvr, EventHandler } from 'app/model/core';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-io-event',
  templateUrl: './io-event.component.html',
  styleUrls: ['./io-event.component.css']
})
export class IoEventComponent implements OnInit {
  /** 透過selector得到的當前NVR */
  currentNVR: Nvr;
  /** 欲編輯的IOEventHandler */
  currentEventHandler: EventHandler;
  nvrConfigs: Nvr[];

  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    this.fetchNvr();
  }

  fetchNvr() {
    Observable.fromPromise(this.parseService.fetchData({ type: Nvr }))
      .map(result => this.nvrConfigs = result)
      .subscribe();
  }

  /** Nvr Selector callback */
  selectNvrEvent(nvr: Nvr) {
    this.currentNVR = nvr;
    Observable.fromPromise(this.parseService.getData({
      type: EventHandler,
      filter: query => query
        .equalTo('NvrId', nvr.Id)
        .equalTo('DeviceId', 0)
    })).map(result => {
      if (result) {
        this.currentEventHandler = result;
      } else {
        this.currentEventHandler = this.createFakeEventHandler(nvr);
      }
    }).subscribe();
  }

  createFakeEventHandler(nvr: Nvr): EventHandler {
    return new EventHandler({
      NvrId: nvr.Id,
      DeviceId: 0,
      Schedule: '',
      EventHandler: []
    });
  }
}
