import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { UserService } from 'app/service/user.service';
import { Observable } from 'rxjs/Observable';
import { RoleType } from 'app/model/core';

@Injectable()
export class AdminGuard implements CanActivate {

    constructor(
        private router: Router,
        private userService: UserService
    ) {
    }

    /** 目前使用在判斷User頁面是否可存取 */
    canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
        const valid = this.userService.isAllowConfigPage('User');
        if (!valid) {
            this.router.navigateByUrl('/');
        }
        return valid;
    }
}
