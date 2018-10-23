import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { IoEventRoutingModule } from './io-event-routing.module';
import { IoEventComponent } from './io-event.component';
import { EventTypeListComponent } from './event-type-list/event-type-list.component';

@NgModule({
  imports: [
    SharedModule,
    IoEventRoutingModule
  ],
  declarations: [IoEventComponent, EventTypeListComponent]
})
export class IoEventModule { }
