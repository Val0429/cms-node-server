import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SmartMediaComponent } from 'app/views/smart-media/smart-media.component';

const routes: Routes = [
  {
    path: '',
    component: SmartMediaComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SmartMediaRoutingModule { }
