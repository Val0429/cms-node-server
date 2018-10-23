import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { NvrRoutingModule } from './nvr-routing.module';
import { NvrComponent } from './nvr.component';
import { NvrEditorComponent } from './nvr-editor/nvr-editor.component';
import { NvrSearchComponent } from './nvr-search/nvr-search.component';

@NgModule({
  imports: [
    SharedModule,
    NvrRoutingModule
  ],
  declarations: [NvrComponent, NvrEditorComponent, NvrSearchComponent]
})
export class NvrModule { }
