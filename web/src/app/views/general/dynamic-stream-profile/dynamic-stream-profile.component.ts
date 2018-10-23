import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-dynamic-stream-profile',
  templateUrl: './dynamic-stream-profile.component.html',
  styleUrls: ['./dynamic-stream-profile.component.css']
})
export class DynamicStreamProfileComponent implements OnInit {
  @Input() generalSetting: any;
  streamProfileOptions = [];

  constructor() { }

  ngOnInit() {
    // 產生數字選項
    for (let i = 1; i < 65; i++) {
      this.streamProfileOptions.push('' + i);
    }
  }

}
