import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CmsManagerComponent } from 'app/views/cms-manager/cms-manager.component';

const routes: Routes = [
  {
    path: '',
    component: CmsManagerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CmsManagerRoutingModule { }
