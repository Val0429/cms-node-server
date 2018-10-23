import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { GeneralRoutingModule } from './general-routing.module';
import { GeneralComponent } from './general.component';
import { MailServerComponent } from './mail-server/mail-server.component';
import { FtpServerComponent } from './ftp-server/ftp-server.component';
import { DynamicStreamProfileComponent } from './dynamic-stream-profile/dynamic-stream-profile.component';
import { DecodeIframeComponent } from './decode-iframe/decode-iframe.component';
import { VideoTitleBarComponent } from './video-title-bar/video-title-bar.component';
import { WatermarkComponent } from './watermark/watermark.component';
import { StartupOptionsComponent } from './startup-options/startup-options.component';
import { BandwidthControlComponent } from './bandwidth-control/bandwidth-control.component';

@NgModule({
  imports: [
    SharedModule,
    GeneralRoutingModule
  ],
  declarations: [GeneralComponent, MailServerComponent, FtpServerComponent,
    DynamicStreamProfileComponent, DecodeIframeComponent, VideoTitleBarComponent,
    WatermarkComponent, StartupOptionsComponent, BandwidthControlComponent]
})
export class GeneralModule { }
