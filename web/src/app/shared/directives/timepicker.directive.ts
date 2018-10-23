import { Directive, Input, ElementRef, AfterViewInit, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[appTimepicker]'
})
export class TimepickerDirective implements AfterViewInit {

  baseOptions = {};

  /** 額外設定可參考 https://jdewit.github.io/bootstrap-timepicker/ */
  @Input() timepickerOptions = { showSeconds: true };

  @Output() timepickerChange = new EventEmitter();

  constructor(
    private el: ElementRef
  ) {
  }

  ngAfterViewInit() {
    this.initTimepicker();
  }

  initTimepicker() {
    Object.assign(this.baseOptions, this.timepickerOptions);
    $(this.el.nativeElement).timepicker(this.baseOptions)
      .on('changeTime.timepicker', event => {
        const value = event['time'] ? event['time'].value : '';
        this.timepickerChange.emit(value);
      });

  }
}
