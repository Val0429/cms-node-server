import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalDirective } from 'ngx-bootstrap';
import { IPageViewerOptions } from 'app/shared/components/page-viewer/page-viewer.component';
import { RoleType, UserGroup, Nvr } from 'app/model/core';
import { ParseService } from 'app/service/parse.service';
import { UserService } from 'app/service/user.service';
import { CoreService } from 'app/service/core.service';
import { CryptoService } from 'app/service/crypto.service';
import { Observable } from 'rxjs/Observable';
// import { CryptoService } from 'app/service/crypto.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {

  @ViewChild('editModal') editModal: ModalDirective;

  userList: Parse.User[] = [];
  groupList: UserGroup[];
  nvrList: Nvr[];
  regexUsername = new RegExp(/^\w+$/);
  currentEditUser: Parse.User;

  /** User可編輯項目 */
  editUserModel: IEditUserModel = {};

  displayUserGroup: boolean;
  currentDisplayUserGroup: UserGroup;
p:number=1;
pageSize:number=20;
  pageViewerOptions: IPageViewerOptions;

  queryParams: {
    page?: number,
    group?: string
  } = {
      group: 'all'
    };

  fakePassword = '@@@@@@';
  flag = {
    save: false
  };
  
  filterInput(event){
    var test = this.regexUsername.test(event.key);
    console.debug(event);
    console.debug(test);
    if(!test) event.preventDefault();    
  }
  /** 在Group=Admin及SuperUser時回傳true */
  get getNvrPermissionDisabled() {
    return this.editUserModel.group === RoleType.ADMINISTRATOR || this.editUserModel.group === RoleType.SUPERUSER;
  }

  get getCurrentDisplayUserGroup() {
    return this.editUserModel ? this.groupList.find(x => x.Name === this.editUserModel.group) : undefined;
  }

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    // private ngZone: NgZone,
    private userService: UserService,
    private parseService: ParseService,
    private coreService: CoreService,
    private cryptoService: CryptoService
  ) { }

  ngOnInit() {
    this.fetchRouteQueryParams()
      .switchMap(() => this.fetchGroups())
      .switchMap(() => this.fetchNvrs())
      .switchMap(() => this.fetchUsers())
      .subscribe();
  }

  fetchGroups() {
    const queryGroups = Observable.fromPromise(this.parseService.fetchData({
      type: UserGroup
    })).map(userGroups => this.groupList = userGroups);
    return queryGroups;
  }

  fetchNvrs() {
    const queryNvrs = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query.limit(30000).ascending("SequenceNumber")
    })).map(nvrs => this.nvrList = nvrs);
    return queryNvrs;
  }

  fetchRouteQueryParams() {
    const queryParams$ = this.activatedRoute.queryParams
      .do(queryParams => {
        Object.assign(this.queryParams, queryParams);
        ['page']
          .forEach(key => this.queryParams[key] = +this.queryParams[key] || 0);
      });
    return queryParams$;
  }

  /** 取得 Host */
  fetchUsers() {
    this.userList = undefined;

    // 分頁器選項
    const options: IPageViewerOptions = {
      currentPage: this.queryParams.page || 1,
      pageVisibleSize: 10,
      itemVisibleSize: 10,
      itemCount: 0
    };

    // 查詢條件
    const filter = (query: Parse.Query<Parse.User>) => {
      query.ascending('createdAt');
      if (this.queryParams.group && this.queryParams.group !== 'all') {
        query.equalTo('Group', this.queryParams.group);
      }
    };

    // 取得分頁資料
    const fetch$ = Observable.fromPromise(this.parseService.fetchPagingAndCount({
      type: Parse.User,
      currentPage: options.currentPage,
      itemVisibleSize: options.itemVisibleSize,
      filter: filter
    })).do(result => {
      options.itemCount = result.count;
      this.pageViewerOptions = options;
      this.userList = result.data;

      if (this.userList.length === 0 && options.currentPage > 1) {
        this.pageChange(options.currentPage - 1);
      }
    });

    return fetch$;
  }

  /** 頁碼變更 */
  pageChange(pageNumber?: number) {
    const queryParams = Object.assign({}, this.queryParams);
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
        delete queryParams[key];
      }
    });

    queryParams.page = pageNumber || 1;
    this.router.navigate(['/user'], { queryParams: queryParams });
  }

  /** 清除搜尋 */
  clearSearch() {
    Object.keys(this.queryParams)
      .forEach(key => delete this.queryParams[key]);
    this.pageChange();
  }

  createUser() {
    let testUserName = this.regexUsername.test(this.editUserModel.username);
    console.debug(testUserName, this.editUserModel.username);
    if(testUserName!==true){
      alert("Invalid username");
      return;
    }
    const user = new Parse.User();
    user.setUsername(this.cryptoService.encrypt4DB(this.editUserModel.username));
    user.setPassword(this.cryptoService.encrypt4DB(this.editUserModel.password));
    user.setEmail(this.editUserModel.email);
    user.set('Group', this.editUserModel.group);
    user.set('NVR', this.editUserModel.nvr);

    const setId$ = this.getNewUserId()
      .map(newId => user.set('Id', newId));

    this.flag.save = true;

    setId$
      .switchMap(() => Observable.fromPromise(user.save())
        .map(result => this.coreService.notifyWithParseResult({
          parseResult: [result], path: this.coreService.urls.URL_CLASS_USER
        })))
      .map(() => alert('Successfully Saved'))
      .map(() => this.editModal.hide())
      .map(() => this.editUserModel = {})
      .switchMap(() => this.fetchUsers())
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  updateUser() {

    const user = this.currentEditUser;
    user.setUsername(this.cryptoService.encrypt4DB(this.editUserModel.username));
    if (this.editUserModel.password && this.editUserModel.password !== this.fakePassword) {
      user.setPassword(this.cryptoService.encrypt4DB(this.editUserModel.password));
    }
    if (this.editUserModel.email) {
      user.setEmail(this.editUserModel.email);
    }
    user.set('Group', this.editUserModel.group);
    user.set('NVR', this.editUserModel.nvr);

    // 儲存 FRS User
    const saveUser$ = Observable.fromPromise(user.save(null, { useMasterKey: true }));

    this.flag.save = true;

    // 合併執行
    saveUser$
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_USER
      }))
      .map(() => alert('Successfully Saved'))
      .map(() => {
        // 修改了自己的密碼 -> 登出
        if (this.currentEditUser.getUsername() === this.cryptoService.encrypt4DB(this.userService.storage['username'])) {
          this.userService.logOut();
          return;
        }
        this.editModal.hide();
        this.currentEditUser = undefined;
      })
      .concatMap(() => this.fetchUsers())
      .toPromise()
      .catch(alert)
      .then(() => this.flag.save = false);
  }

  remove(user: Parse.User) {
    event.stopPropagation();

    if (this.getDecryptText(user.getUsername()).toLowerCase() === 'admin') {
      alert('Can not delete Admin account.');
      return;
    }

    if (!user || !confirm('Are you sure to delete this User?')) {
      return;
    }

    // 移除 Parse.User
    const destroyUser$ = Observable.fromPromise(user.destroy({ useMasterKey: true }));

    // 合併執行
    destroyUser$
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_USER
      }))
      .map(() => alert('Successfully Removed'))
      .concatMap(() => this.fetchUsers())
      .toPromise()
      .catch(alert);
  }

  /** 取得欲編輯的FRSUser資料 */
  setEditUser(user: Parse.User) {
    this.currentEditUser = user;
    this.editUserModel = {
      username: this.cryptoService.decrypt4DB(user.getUsername()),
      password: this.fakePassword,
      email: user.getEmail(),
      group: user.get('Group'),
      nvr: user.get('NVR')
    };
  }

  /** 檢查Nvr CheckAll目前應顯示的狀態 */
  checkAllNVRPermission() {
    if (!this.nvrList) {
      return false;
    }
    // Group=Admin or SuperUser時直接return true
    if (this.getNvrPermissionDisabled) {
      return true;
    }

    const checks = this.nvrList.map(nvr => this.checkNVRPermission(nvr));
    return !checks.some(x => x === false);
  }

  /** 檢查當前User是否有指定id的NVR Permission資料 */
  checkNVRPermission(nvr: Nvr): boolean {
    switch (this.editUserModel.group) {
      case RoleType.ADMINISTRATOR:
      case RoleType.SUPERUSER:
        return true;
      default:
        if (!this.editUserModel.nvr) {
          return false;
        }
        const item = this.editUserModel.nvr.find(x => x.Id === nvr.Id);
        return item ? true : false;
    }
  }

  /** Nvr CheckAll 點選時的處理動作 */
  setAllNVRPermission() {
    const currentStatus = this.checkAllNVRPermission();
    const changeList = this.nvrList.map(nvr => {
      if (this.checkNVRPermission(nvr) === currentStatus) {
        return nvr;
      }
      return undefined;
    });
    changeList.forEach(nvr => {
      if (nvr) {
        this.setNVRPermission(nvr);
      }
    });
  }

  /** 打勾或取消NVR時的動作 */
  setNVRPermission(nvr: any) {
    if (!this.editUserModel.nvr) {
      this.editUserModel.nvr = [];
    }
    if (this.checkNVRPermission(nvr)) {
      // 原本有打勾就移除
      const item = this.editUserModel.nvr.find(x => x.Id === nvr.Id);
      const index = this.editUserModel.nvr.indexOf(item);
      this.editUserModel.nvr.splice(index, 1);
    } else {
      // 原本沒打勾就新增
      const newObj: IUserNvrSetup = {
        Name: 'NVR',
        Id: nvr.Id,
        Permission: ['Access']
      };
      this.editUserModel.nvr.push(newObj);
      this.editUserModel.nvr.sort(function (a, b) {
        return (a.Id > b.Id) ? 1 : ((b.Id > a.Id) ? -1 : 0);
      });
    }
  }

  getDecryptText(encryptText?: string) {
    return encryptText ? this.cryptoService.decrypt4DB(encryptText) : '';
  }

  setUserGroup() {
    if (this.currentDisplayUserGroup) {
      this.currentDisplayUserGroup = undefined;
      return;
    }
    this.currentDisplayUserGroup = this.groupList.find(x => x.Name === this.editUserModel.group);
  }

  /** 取得所有User並找出適當User Id */
  getNewUserId() {
    const get$ = Observable.fromPromise(this.parseService.fetchData({
      type: Parse.User,
      filter: query => query
        .ascending('Id')
        .select('Id')
        .limit(30000)
    })).map(users => {
      let result = 1;
      users.forEach(user => {
        if (result === Number(user.get('Id'))) {
          result++;
        } else {
          return;
        }
      });
      return result.toString();
    });
    return get$;
  }
}

interface IEditUserModel {
  username?: string;
  password?: string;
  email?: string;
  group?: string;
  nvr?: IUserNvrSetup[];
}

interface IUserNvrSetup {
  Name: string;
  Id: string;
  Permission: string[];
}
