import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { StorageRoutingModule } from './storage-routing.module';
import { StorageComponent } from './storage.component';
import { StorageSettingComponent } from './storage-setting/storage-setting.component';
import { StorageEditorComponent } from './storage-editor/storage-editor.component';

// @NgModule({
//   imports: [
//     SharedModule,
//     StorageRoutingModule
//   ],
//   declarations: [StorageComponent, StorageSettingComponent, StorageEditorComponent]
// })
export class StorageModule { }
