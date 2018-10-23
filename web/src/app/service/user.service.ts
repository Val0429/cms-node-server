import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { RoleType } from 'app/model/core';
// import { CoreService } from 'app/service/core.service';
import { Observable } from 'rxjs/Observable';
import { ParseService } from 'app/service/parse.service';
import { CryptoService } from 'app/service/crypto.service';
import { UserGroup } from 'app/model/core';

@Injectable()
export class UserService {
    /** 當前使用者 */
    currentUser: Parse.User;
    /** 存放UserGroup內記錄的當前User Page.Setup的權限 */
    currentUserPermission: string[];

    /** 使用者資訊 */
    storage: { [key: string]: any } = {};

    /** 判斷登入者是否允許操作ConfigTool */
    get isAllowConfig() {
        return this.currentUserPermission ? true : false;
    }

    constructor(
        private router: Router,
        private parseService: ParseService,
        private cryptoService: CryptoService
    ) {
        this.readStorage();
    }

    readStorage() {
        if (localStorage.hasOwnProperty('USER_INFO')) {
            this.storage = JSON.parse(localStorage.getItem('USER_INFO'));
        }
    }

    saveStorage() {
        localStorage.setItem('USER_INFO', JSON.stringify(this.storage));
    }

    /** 登入 Parse Server */
    logIn(args: {
        username: string,
        password: string
    }) {
        const login$ = Observable.fromPromise(Parse.User.logIn(
            this.cryptoService.encrypt4DB(args.username),
            this.cryptoService.encrypt4DB(args.password)
        )).map(user => {
            if (!user) {
                return false;
            }
            this.storage['sessionToken'] = user.getSessionToken();
            this.storage['username'] = args.username;
            this.storage['password'] = args.password;
            this.currentUser = user;
            this.saveStorage();
            return true;
        })
            .concatMap(() => this.getUserGroup())
            .map(user => user)
            .toPromise();
        return login$;
    }

    logOut() {
        this.cleanUserInfo();
        this.router.navigateByUrl('/login');
        return Parse.User.logOut();
    }

    cleanUserInfo() {
        this.storage = {};
        this.currentUser = undefined;
        localStorage.removeItem('USER_INFO');
    }

    /** 新增 Parse Server User */
    signUp(args: {
        username: string,
        password: string,
        email?: string,
        id: string,
        group: string,
        nvr?: any[]
    }) {
        const user = new Parse.User();
        user.set('username', this.cryptoService.encrypt4DB(args.username));
        user.set('password', this.cryptoService.encrypt4DB(args.password));
        user.set('email', args.email);
        // 以下為額外新增欄位
        user.set('Id', args.id);
        user.set('Group', args.group);
        // user.set('DeviceGroup', undefined);
        user.set('NVR', args.nvr);
        user.set('ACL', {
            '*': {
                read: true, write: true
            }
        });
        return user.signUp(null, { useMasterKey: true });
    }

    checkLogInStatus(): Promise<boolean> {
        const sessionToken = this.storage['sessionToken'];
        if (!sessionToken) {
            return Observable.of(false).toPromise();
        }

        const check$ = this.parseService.initParseServer()
            .concatMap(() => Parse.User.become(sessionToken))
            .map(user => this.currentUser = user)
            .concatMap(() => this.getUserGroup())
            .map(user => !!user)
            .toPromise();
        return check$;

        // const check$ = Observable.fromPromise(Parse.User.become(sessionToken))
        //     .map(user => this.currentUser = user)
        //     .concatMap(() => this.getUserGroup())
        //     .map(user => !!user)
        //     // .concatMap(() => this.fetchUserRoles())
        //     // .map(user => !!user)
        //     .toPromise();

        // return check$;
    }

    getUser(filter?: (query: Parse.Query<Parse.User>) => void): Parse.Promise<Parse.User> {
        const query = new Parse.Query(Parse.User);
        if (filter) {
            filter(query);
        }
        return query.first({ useMasterKey: true });
    }

    getUsers(filter?: (query: Parse.Query<Parse.User>) => void): Parse.Promise<Parse.User[]> {
        const query = new Parse.Query(Parse.User);
        if (filter) {
            filter(query);
        }
        return query.find({ useMasterKey: true });
    }

    /** 修改User屬性 */
    setUser(args: {
        user: Parse.User,
        newPassword?: string,
        newEmail?: string,
        newGroup?: string,
        newNvr?: any[]
    }) {
        if (args.newPassword) {
            args.user.set('password', this.cryptoService.encrypt4DB(args.newPassword));
        }
        if (args.newEmail) {
            args.user.set('email', args.newEmail);
        }
        if (args.newGroup) {
            args.user.set('Group', args.newGroup);
        }
        if (args.newNvr) {
            args.user.set('NVR', args.newNvr);
        }

        return args.user.save(null, { useMasterKey: true });
    }

    deleteUser(user: Parse.User) {
        return user.destroy({ useMasterKey: true });
    }

    countUsers(filter?: (query: Parse.Query<Parse.User>) => void): Parse.Promise<number> {
        const query = new Parse.Query(Parse.User);
        if (filter) {
            filter(query);
        }
        return query.count({ useMasterKey: true });
    }

    /** 取得Current User的所屬Group */
    getUserGroup() {
        const group$ = Observable.fromPromise(this.parseService.getData({
            type: UserGroup,
            filter: query => {
                query.equalTo('Name', this.currentUser.attributes.Group);
            }
        })).map(group => {
            const setupPage = group.Page.find(x => x.Name.toLowerCase() === 'setup');
            this.currentUserPermission = setupPage ? setupPage.Permission : undefined;
            return group;
        });

        return group$;
    }

    /** 判斷登入者是否允許操作指定頁面 */
    isAllowConfigPage(page: string) {
        return this.currentUserPermission.some(x => x.toLowerCase() === page.toLowerCase());
    }
}
