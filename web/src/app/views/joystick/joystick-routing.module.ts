import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { JoystickComponent } from 'app/views/joystick/joystick.component';

const routes: Routes = [
  {
    path: '',
    component: JoystickComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JoystickRoutingModule { }
