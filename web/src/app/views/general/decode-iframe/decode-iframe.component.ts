import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-decode-iframe',
  templateUrl: './decode-iframe.component.html',
  styleUrls: ['./decode-iframe.component.css']
})
export class DecodeIframeComponent implements OnInit {
  @Input() generalSetting: any;
  videoStreamReachOptions = [];
  constructor() { }

  ngOnInit() {
    // 產生數字選項
    for (let i = 1; i < 129; i++) {
      this.videoStreamReachOptions.push('' + i);
    }
  }

}
