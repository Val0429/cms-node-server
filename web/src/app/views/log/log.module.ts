import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

import { LogRoutingModule } from './log-routing.module';
import { LogComponent } from './log.component';

@NgModule({
  imports: [
    SharedModule,
    LogRoutingModule,
    TabsModule,
    BsDatepickerModule
  ],
  declarations: [LogComponent]
})
export class LogModule { }
