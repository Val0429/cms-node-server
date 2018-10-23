import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ISapLayoutComponent } from './shared/layouts/isap-layout/isap-layout.component';
import { LoginComponent } from './login/login.component';
import { LoginGuard } from './core/login.guard';
import { AdminGuard } from './core/admin.guard';

const routes: Routes = [
  {
    path: '',
    component: ISapLayoutComponent,
    canActivate: [LoginGuard],
    children: [
      {
        path: '',
        redirectTo: 'cms-manager',
        pathMatch: 'full'
      },
      {
        path: 'cms-manager',
        loadChildren: 'app/views/cms-manager/cms-manager.module#CmsManagerModule'
      },
      {
        path: 'server',
        loadChildren: 'app/views/server/server.module#ServerModule'
      },
      {
        path: 'storage',
        loadChildren: 'app/views/storage/storage.module#StorageModule'
      },
      {
        path: 'nvr',
        loadChildren: 'app/views/nvr/nvr.module#NvrModule'
      },
      {
        path: 'group',
        loadChildren: 'app/views/group/group.module#GroupModule'
      },
      {
        path: 'camera',
        loadChildren: 'app/views/camera/camera.module#CameraModule'
      },
      {
        path: 'smart-media',
        loadChildren: 'app/views/smart-media/smart-media.module#SmartMediaModule'
      },
      {
        path: 'general',
        loadChildren: 'app/views/general/general.module#GeneralModule'
      },
      {
        path: 'user',
        loadChildren: 'app/views/user/user.module#UserModule',
        canActivate: [AdminGuard],
      },
      {
        path: 'event',
        loadChildren: 'app/views/event/event.module#EventModule'
      },
      // {
      //   path: 'schedule',
      //   loadChildren: 'app/views/schedule/schedule.module#ScheduleModule'
      // },
      {
        path: 'schedule-template',
        loadChildren: 'app/views/schedule-template/schedule-template.module#ScheduleTemplateModule'
      },
      {
        path: 'joystick',
        loadChildren: 'app/views/joystick/joystick.module#JoystickModule'
      },
      {
        path: 'license',
        loadChildren: 'app/views/license/license.module#LicenseModule'
      },
      {
        path: 'io-event',
        loadChildren: 'app/views/io-event/io-event.module#IoEventModule'
      },
      {
        path: 'log',
        loadChildren: 'app/views/log/log.module#LogModule'
      },
      {
        path: 'event-recovery',
        loadChildren: 'app/views/event-recovery/event-recovery.module#EventRecoveryModule'
      },
      {
        path: 'test-tool',
        loadChildren: 'app/views/test-tool/test-tool.module#TestToolModule',
        canActivate: [AdminGuard],
      },
    ]
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    // 萬用路由，此條務必置於路由配置集合的最後一個，因為路由讀取有順序性
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // 需要觀察路由變化的話，再改成 True
    enableTracing: false
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
