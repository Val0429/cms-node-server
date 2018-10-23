import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { EventRecoveryRoutingModule } from './event-recovery-routing.module';
import { EventRecoveryComponent } from './event-recovery.component';

@NgModule({
  imports: [
    SharedModule,
    EventRecoveryRoutingModule
  ],
  declarations: [EventRecoveryComponent]
})
export class EventRecoveryModule { }
