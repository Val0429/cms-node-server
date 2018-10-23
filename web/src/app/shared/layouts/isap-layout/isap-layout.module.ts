import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Ng2BootstrapModule } from 'ngx-bootstrap';

import { ISapLayoutComponent } from './isap-layout.component';
import { ISapHeaderComponent } from './isap-header/isap-header.component';
import { ISapSidebarComponent } from './isap-sidebar/isap-sidebar.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    Ng2BootstrapModule
  ],
  exports: [
    ISapLayoutComponent,
    ISapHeaderComponent,
    ISapSidebarComponent
  ],
  declarations: [
    ISapLayoutComponent,
    ISapHeaderComponent,
    ISapSidebarComponent
  ]
})
export class ISapLayoutModule { }
