import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { IoEventComponent } from 'app/views/io-event/io-event.component';

const routes: Routes = [
  {
    path: '',
    component: IoEventComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IoEventRoutingModule { }
