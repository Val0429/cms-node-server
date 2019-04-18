import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CoreService } from 'app/service/core.service';
import { IsapSidebarService } from './layouts/isap-layout/isap-sidebar.service';
import { EventService } from 'app/service/event.service';
import { CameraService } from 'app/service/camera.service';
import { GroupService } from 'app/service/group.service';
import { CryptoService } from 'app/service/crypto.service';
import { UserService } from 'app/service/user.service';
import { ParseService } from 'app/service/parse.service';
import { LicenseService } from 'app/service/license.service';
import { CSVService } from 'app/service/csv.service';
import { NvrService } from './nvr.service';
import { RestFulService } from './restful.service';
import { ServerService } from './server.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpModule,
    RouterModule
  ],
  declarations: [],
  providers: [CoreService, IsapSidebarService, EventService, CameraService, NvrService,
    GroupService, CryptoService, UserService, ParseService, LicenseService, RestFulService, 
    ServerService, CSVService]
})
export class ServiceModule { }
