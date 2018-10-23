import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { GroupRoutingModule } from './group-routing.module';
import { GroupComponent } from './group.component';

@NgModule({
  imports: [
    SharedModule,
    GroupRoutingModule
  ],
  declarations: [GroupComponent]
})
export class GroupModule { }
