import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RecordPathComponent } from './record.path.component';

const routes: Routes = [
  {
    path: '',
    component: RecordPathComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StorageRoutingModule { }
