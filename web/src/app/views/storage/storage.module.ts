import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { StorageRoutingModule } from './storage-routing.module';
import { RecordPathComponent } from './record.path.component';
import { RecordPathEditorComponent } from './record-path-editor/record-path-editor.component';

@NgModule({
  imports: [
    SharedModule,
    StorageRoutingModule
  ],
  declarations: [RecordPathComponent,RecordPathEditorComponent]
})
export class StorageModule { }
