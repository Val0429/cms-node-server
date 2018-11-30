import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { CoreService } from 'app/service/core.service';
import { UserService } from 'app/service/user.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit {
  myform: FormGroup;
  username: FormControl;
  password: FormControl;

  constructor(
    private router: Router,
    private coreService: CoreService,
    private userService: UserService
  ) { 
    this.createForm();
  }
createForm() {
    this.username = new FormControl('', [
      Validators.required,
      Validators.maxLength(32)
    ]);
    this.password = new FormControl('', [
      Validators.required,
      Validators.maxLength(32)
    ]);
    this.myform = new FormGroup({
      username: this.username,
      password: this.password,      
    });
  }
  ngOnInit() {
    this.username.setValue(this.userService.storage['username']);
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
  regexUsername = new RegExp(/[a-zA-Z_-\d]/);
  filterInput(event){
    var test = this.regexUsername.test(event.key);
    console.debug(event);
    console.debug(test);
    if(!test) event.preventDefault();    
  }
  doLogin(event) {
    if (event.keyCode !== 13 || !this.myform.valid) return;
    this.login();
  }
  login() {
    

    this.userService.logIn({
      username: this.username.value,
      password: this.password.value
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
