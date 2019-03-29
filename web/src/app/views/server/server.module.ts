import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { ServerRoutingModule } from './server-routing.module';
import { ServerComponent } from './server.component';
import { StorageEditorComponent } from '../storage/storage-editor/storage-editor.component';
import { StorageSettingComponent } from '../storage/storage-setting/storage-setting.component';
import { StorageComponent } from '../storage/storage.component';

@NgModule({
  imports: [
    SharedModule,
    ServerRoutingModule
  ],
  declarations: [ServerComponent, StorageEditorComponent, StorageSettingComponent, StorageComponent]
})
export class ServerModule { }
