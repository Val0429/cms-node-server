import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { JoystickRoutingModule } from './joystick-routing.module';
import { JoystickComponent } from './joystick.component';

@NgModule({
  imports: [
    SharedModule,
    JoystickRoutingModule
  ],
  declarations: [JoystickComponent]
})
export class JoystickModule { }
