import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';
import { CmsManagerRoutingModule } from './cms-manager-routing.module';
import { CmsManagerComponent } from './cms-manager.component';
import { FailoverSetupComponent } from './failover-setup/failover-setup.component';
import { TempPathComponent } from './temp-path/temp-path.component';

@NgModule({
  imports: [
    SharedModule,
    CmsManagerRoutingModule
  ],
  declarations: [CmsManagerComponent, FailoverSetupComponent, TempPathComponent]
})
export class CmsManagerModule { }
