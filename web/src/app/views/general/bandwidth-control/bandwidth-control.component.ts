import { Component, OnInit, Input } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { OptionHelper } from 'app/helper/option.helper';

@Component({
  selector: 'app-bandwidth-control',
  templateUrl: './bandwidth-control.component.html',
  styleUrls: ['./bandwidth-control.component.css']
})
export class BandwidthControlComponent implements OnInit {
  @Input() generalSetting: any;
  @Input() nvrConfig: any;
  bandwidthOptions = {
    'Original Streaming': -1,
    'Bitrate 1M': 1024,
    'Bitrate 512K': 512,
    'Bitrate 256K': 256,
    'Bitrate 56K': 56
  };

  // 為了使用select template必須先準備好選項物件，若是點擊當下才去取得選項物件的話選單會閃爍更新
  bandwidthOptionsObject: any;
  streamOptions = [
    1, 2
  ];
  constructor(private coreService: CoreService) { }

  ngOnInit() {
    this.bandwidthOptionsObject = OptionHelper.getOptions(this.bandwidthOptions);
  }
}
