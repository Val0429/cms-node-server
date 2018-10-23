import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { CoreService } from 'app/service/core.service';
import { UserService } from 'app/service/user.service';
import { RoleType } from 'app/model/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit {
  model: {
    username?: string,
    password?: string
  } = {};

  constructor(
    private router: Router,
    private coreService: CoreService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.model.username = this.userService.storage['username'];
    this.waitForParseInit();
  }

  /** 等待Parse Init後再執行檢查DBUser */
  waitForParseInit() {
    if (Parse.masterKey) {
      this.checkDBUser();
      return;
    }

    setTimeout(() => {
      this.waitForParseInit();
    }, 1000);
  }

  /** 檢查DB內是否有user，若無則自動新增一筆Admin帳號 */
  checkDBUser() {
    this.userService.countUsers()
      .then(count => {
        if (count === 0) {
          this.userService.signUp({
            username: 'Admin',
            password: '123456',
            id: '1',
            group: 'Administrator'
          });
        }
      });
  }

  login() {
    if (this.model.username && this.model.username.length > 128) {
      this.model.username = this.model.username.substr(0, 128);
    }

    if (this.model.password && this.model.password.length > 128) {
      this.model.password = this.model.password.substr(0, 128);
    }

    this.userService.logIn({
      username: this.model.username,
      password: this.model.password
    }).then(result => {
      if (!result) {
        return;
      }
      // 檢查登入者身份
      if (!this.userService.isAllowConfig) {
        this.userService.cleanUserInfo();
        throw new Error('You don\'t have permission to access');
      }

      this.router.navigateByUrl('/');
    }).catch(alert);
  }

}
