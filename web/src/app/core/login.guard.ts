import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { UserService } from 'app/service/user.service';
import { Observable } from 'rxjs/Observable';
import { RoleType } from 'app/model/core';

@Injectable()
export class LoginGuard implements CanActivate {

  constructor(
    private router: Router,
    private userService: UserService
  ) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    const valid = this.userService.checkLogInStatus()
      .then(result => {
        if (!result || !this.userService.currentUser || !this.userService.isAllowConfig) {
          this.router.navigateByUrl('/login');
          return false;
        }
        return result;
      });
    valid.catch(error => {
      alert(error);
      this.router.navigateByUrl('/login');
    });
    return valid;
  }
}
