import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { CameraRoutingModule } from './camera-routing.module';
import { CameraComponent } from './camera.component';
import { CameraSearchComponent } from './camera-search/camera-search.component';
import { CameraEditorComponent } from './camera-editor/camera-editor.component';

@NgModule({
  imports: [
    SharedModule,
    CameraRoutingModule
  ],
  declarations: [CameraComponent, CameraSearchComponent, CameraEditorComponent]
})
export class CameraModule { }
