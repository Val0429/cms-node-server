import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { ScheduleTemplateRoutingModule } from './schedule-template-routing.module';
import { ScheduleTemplateComponent } from './schedule-template.component';
import { ScheduleTemplateEditorComponent } from './schedule-template-editor/schedule-template-editor.component';
import { TemplateSetupComponent } from './template-setup/template-setup.component';
import { WeekBoardComponent } from './schedule-template-editor/week-board/week-board.component';
import { TreeNodeComponent } from './template-setup/tree-node/tree-node.component';
import { WeekSchedulerComponent } from './schedule-template-editor/week-scheduler/week-scheduler.component';

@NgModule({
  imports: [
    SharedModule,
    ScheduleTemplateRoutingModule
  ],
  declarations: [ScheduleTemplateComponent, ScheduleTemplateEditorComponent, TemplateSetupComponent, WeekBoardComponent, TreeNodeComponent, WeekSchedulerComponent]
})
export class ScheduleTemplateModule { }
