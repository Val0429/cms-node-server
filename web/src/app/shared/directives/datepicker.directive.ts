import { Directive, ElementRef, Input, AfterViewInit, Output, EventEmitter } from '@angular/core';
import * as moment from 'moment';

@Directive({
  selector: '[appDatepicker]'
})
export class DatepickerDirective implements AfterViewInit {

  baseOptions = {
    format: 'yyyy-mm-dd',
    todayBtn: true,
    todayHighlight: true
  };

  @Input() datepickerOptions = {};

  @Output() datepickerChange = new EventEmitter();

  constructor(
    private el: ElementRef
  ) { }

  ngAfterViewInit() {
    this.initDatepicker();
  }

  initDatepicker() {
    Object.assign(this.baseOptions, this.datepickerOptions);
    $(this.el.nativeElement).datepicker(this.baseOptions)
      .on('changeDate', event => this.datepickerChange.emit(moment(event['date']).format('YYYY-MM-DD')));
  }
}
