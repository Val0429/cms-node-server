import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TestToolComponent } from 'app/views/test-tool/test-tool.component';

const routes: Routes = [
  {
    path: '',
    component: TestToolComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TestToolRoutingModule { }
