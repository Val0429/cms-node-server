import { Component, OnInit, Input } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { OptionHelper } from 'app/helper/option.helper';

@Component({
  selector: 'app-startup-options',
  templateUrl: './startup-options.component.html',
  styleUrls: ['./startup-options.component.css']
})
export class StartupOptionsComponent implements OnInit {
  @Input() startupOptions: any;
  bandwidthOptions = {
    'Original Streaming': '-1',
    '1Mbps': '1024',
    '512Kbps': '512',
    '256Kbps': '256',
    '56Kbps': '56'
  };

  // 為了使用select template必須先準備好選項物件，若是點擊當下才去取得選項物件的話選單會閃爍更新
  bandwidthOptionsObject: any;
  viewOptionsObject: any;
  constructor(private coreService: CoreService) { }

  ngOnInit() {
    this.coreService.getConfig({ path: this.coreService.urls.URL_CLASS_DEVICEGROUP })
      .map(result => this.initViewOptionsObject(result.results))
      .subscribe();
    this.bandwidthOptionsObject = OptionHelper.getOptions(this.bandwidthOptions);
  }

  initViewOptionsObject(deviceGroup: any) {
    const items = [{key: 'None', value: ''}];
    deviceGroup.forEach(element => {
      items.push({
        key: element.Name,
        value: element.Id
      });
    });
    items.push({key: 'All Devices', value: 'all'});
    this.viewOptionsObject = items;
  }
}
