import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-ftp-server',
  templateUrl: './ftp-server.component.html',
  styleUrls: ['./ftp-server.component.css']
})
export class FtpServerComponent implements OnInit {
  @Input() ftp: any;

  constructor() { }

  ngOnInit() {
  }

}
