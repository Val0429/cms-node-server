import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { TestToolRoutingModule } from './test-tool-routing.module';
import { TestToolComponent } from './test-tool.component';
import { EventGeneratorComponent } from './event-generator/event-generator.component';

@NgModule({
  imports: [
    SharedModule,
    TestToolRoutingModule
  ],
  declarations: [TestToolComponent, EventGeneratorComponent]
})
export class TestToolModule { }
