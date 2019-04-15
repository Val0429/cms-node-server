import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { ServerRoutingModule } from './server-routing.module';
import { ServerComponent } from './server.component';
import { ServerInfoEditorComponent } from './server-info-editor/server-info-editor.component';

@NgModule({
  imports: [
    SharedModule,
    ServerRoutingModule
  ],
  declarations: [ServerComponent,ServerInfoEditorComponent]
})
export class ServerModule { }
