import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { ScheduleRoutingModule } from './schedule-routing.module';
import { ScheduleComponent } from './schedule.component';
import { WeekSchedulerComponent } from './week-scheduler/week-scheduler.component';
import { NvrDeviceSelectorComponent } from './nvr-device-selector/nvr-device-selector.component';

@NgModule({
  imports: [
    SharedModule,
    ScheduleRoutingModule
  ],
  declarations: [ScheduleComponent, WeekSchedulerComponent, NvrDeviceSelectorComponent]
})
export class ScheduleModule { }
