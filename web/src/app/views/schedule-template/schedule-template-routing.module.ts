import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ScheduleTemplateComponent } from 'app/views/schedule-template/schedule-template.component';

const routes: Routes = [
  {
    path: '',
    component: ScheduleTemplateComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ScheduleTemplateRoutingModule { }
