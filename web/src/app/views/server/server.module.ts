import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { ServerRoutingModule } from './server-routing.module';
import { ServerComponent } from './server.component';

@NgModule({
  imports: [
    SharedModule,
    ServerRoutingModule
  ],
  declarations: [ServerComponent]
})
export class ServerModule { }
