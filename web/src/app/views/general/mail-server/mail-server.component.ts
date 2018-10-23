import { Component, OnInit, Input } from '@angular/core';
import { UserService } from 'app/service/user.service';
import { CryptoService } from 'app/service/crypto.service';

@Component({
  selector: 'app-mail-server',
  templateUrl: './mail-server.component.html',
  styleUrls: ['./mail-server.component.css']
})
export class MailServerComponent implements OnInit {
  /** 外部傳入要修改的General.Mail */
  @Input() mail: any;
  /** 所有User collection資料 */
  userConfigs: Parse.User[];
  /** Sender選項來自User collection */
  senderOptions: string[];
  mailServerSecurityOptions: string[] = ['PLAIN', 'SSL', 'TLS'];

  constructor(private userService: UserService, private cryptoService: CryptoService) { }

  ngOnInit() {
    this.userService.getUsers()
      .then(users => {
        this.userConfigs = users;
        this.senderOptions = this.userConfigs.map(user => this.cryptoService.decrypt4DB(user.getUsername()));
      });
  }

  /** 利用userName取得email回填到General.Mail.MailAddress */
  getUserEmail(userName: string) {
    const matchUser = this.userConfigs.find(user => user.getUsername() === this.cryptoService.encrypt4DB(userName));
    this.mail.MailAddress = matchUser
      ? matchUser.attributes.email
      : '';
  }

}
