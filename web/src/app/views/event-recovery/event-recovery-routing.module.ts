import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EventRecoveryComponent } from 'app/views/event-recovery/event-recovery.component';

const routes: Routes = [
  {
    path: '',
    component: EventRecoveryComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EventRecoveryRoutingModule { }
