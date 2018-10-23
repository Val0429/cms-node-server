import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appEditable]'
})
export class EditableDirective {

  constructor(private el: ElementRef) {
    this.setReadOnly(true);
  }

  @HostListener('dblclick') onDoubleClicks() {
    this.setReadOnly(false);
  }

  @HostListener('keydown', ['$event']) onKeydown(event: any) {
    const value = event.keyCode || event.charCode || event.which;
    if (value !== 13) {
      return;
    }

    this.setReadOnly(true);
  }

  @HostListener('focusout') onFocusout() {
    this.setReadOnly(true);
  }

  setReadOnly(result: boolean) {
    const $dom = $(this.el.nativeElement);
    $dom.prop('readonly', result);
    if (result) {
      $dom.removeAttr('style');
    } else {
      $dom.css({
        'border': '1px dashed #313131',
        'background-color': '#fff',
        'color': '#000'
      });

      const value = $dom.val() as string;
      $dom.prop('selectionStart', 0);
      $dom.prop('selectionEnd', value.length);
    }
  }

}
