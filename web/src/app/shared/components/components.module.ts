import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageViewerComponent } from './page-viewer/page-viewer.component';
import { DiskSpaceComponent } from './disk-space/disk-space.component';
import { ResolutionRegionComponent } from './resolution-region/resolution-region.component';

@NgModule({
  imports: [
    CommonModule
  ],
  exports: [
    PageViewerComponent,
    DiskSpaceComponent,
    ResolutionRegionComponent
  ],
  declarations: [
    PageViewerComponent,
    DiskSpaceComponent,
    ResolutionRegionComponent
  ]
})
export class ComponentsModule { }
