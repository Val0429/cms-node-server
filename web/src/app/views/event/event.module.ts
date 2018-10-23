import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { EventRoutingModule } from './event-routing.module';
import { EventComponent } from './event.component';
import { EventTypeListComponent } from './event-type-list/event-type-list.component';

@NgModule({
  imports: [
    SharedModule,
    EventRoutingModule
  ],
  declarations: [EventComponent, EventTypeListComponent]
})
export class EventModule { }
