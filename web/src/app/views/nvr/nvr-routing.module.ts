import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { NvrComponent } from 'app/views/nvr/nvr.component';

const routes: Routes = [
  {
    path: '',
    component: NvrComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NvrRoutingModule { }
