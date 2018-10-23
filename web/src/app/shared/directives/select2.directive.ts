import { Directive, Input, ElementRef, OnInit, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[appSelect2]'
})
export class Select2Directive implements AfterViewInit {

  baseOptions = {};

  @Input() select2Options: Select2Options;

  constructor(
    private el: ElementRef
  ) { }

  ngAfterViewInit() {
    this.initSelect2();
  }

  initSelect2() {
    Object.assign(this.baseOptions, this.select2Options);
    $(this.el.nativeElement).select2(this.baseOptions);
  }
}
