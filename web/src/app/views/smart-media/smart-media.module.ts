import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { SmartMediaRoutingModule } from './smart-media-routing.module';
import { SmartMediaComponent } from './smart-media.component';

@NgModule({
  imports: [
    SharedModule,
    SmartMediaRoutingModule
  ],
  declarations: [SmartMediaComponent]
})
export class SmartMediaModule { }
