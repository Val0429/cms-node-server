import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { UserRoutingModule } from './user-routing.module';
import { UserComponent } from './user.component';
import { PermissionEditorComponent } from './permission-editor/permission-editor.component';

@NgModule({
  imports: [
    SharedModule,
    UserRoutingModule
  ],
  declarations: [UserComponent, PermissionEditorComponent]
})
export class UserModule { }
