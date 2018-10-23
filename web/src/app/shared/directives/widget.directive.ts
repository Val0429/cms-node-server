import { Directive, OnInit, ElementRef } from '@angular/core';

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[widget]'
})
export class WidgetDirective implements OnInit {

  $el: any;

  constructor(el: ElementRef) {
    this.$el = jQuery(el.nativeElement);
    jQuery.fn['widgster'].Constructor.DEFAULTS.bodySelector = '.widget-body';

    /*
     When widget is closed remove its parent if it is .col-*
     */
    jQuery(document).on('close.widgster', (e) => {
      const $colWrap = jQuery(e.target).closest('.content > .row > [class*="col-"]:not(.widget-container)');

      // remove colWrap only if there are no more widgets inside
      if (!$colWrap.find('.widget').not(e.target).length) {
        $colWrap.remove();
      }
    });
  }

  ngOnInit(): void {
    this.$el.widgster();
  }

}
