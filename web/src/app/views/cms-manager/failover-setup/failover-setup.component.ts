import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-failover-setup',
  templateUrl: './failover-setup.component.html',
  styleUrls: ['./failover-setup.component.css']
})
export class FailoverSetupComponent implements OnInit {
  @Input() failoverConfigs: any[];

  failoverStatusOptions = [
    'Active', 'Backup', 'Disable'
  ];

  constructor() { }

  ngOnInit() {
  }

}
