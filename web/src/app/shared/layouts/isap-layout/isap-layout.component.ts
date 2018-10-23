import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-isap-layout',
  templateUrl: './isap-layout.component.html',
  styleUrls: ['./isap-layout.component.css']
})
export class ISapLayoutComponent implements OnInit, AfterViewInit {

  @ViewChild('sidebar') sidebar: ElementRef;

  @ViewChild('content') content: ElementRef;

  isStaticSidebar = true;

  isMouseInSidebar = false;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }
}
