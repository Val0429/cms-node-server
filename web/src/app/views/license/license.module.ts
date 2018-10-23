import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';

import { LicenseRoutingModule } from './license-routing.module';
import { LicenseComponent } from './license.component';
import { OnlineRegistrationComponent } from './online-registration/online-registration.component';
import { OfflineRegistrationComponent } from './offline-registration/offline-registration.component';

@NgModule({
  imports: [
    SharedModule,
    LicenseRoutingModule
  ],
  declarations: [LicenseComponent, OnlineRegistrationComponent, OfflineRegistrationComponent]
})
export class LicenseModule { }
