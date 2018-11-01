import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { DndModule } from 'ng2-dnd';
import { Ng2BootstrapModule } from 'ngx-bootstrap';
import { Select2Module } from 'ng2-select2';

import { ComponentsModule } from './components/components.module';
import { DirectivesModule } from './directives/directives.module';
import { LayoutsModule } from './layouts/layouts.module';
import { PipesModule } from './pipes/pipes.module';

@NgModule({
  exports: [
    CommonModule,
    FormsModule,
    HttpModule,
    DndModule,
    Ng2BootstrapModule,
    Select2Module,
    PipesModule,
    ComponentsModule,
    DirectivesModule,
    LayoutsModule
  ]
})
export class SharedModule { }
