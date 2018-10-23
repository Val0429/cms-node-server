import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../assets/scss/application.scss']
})
export class AppComponent {
  title = 'app';
}
