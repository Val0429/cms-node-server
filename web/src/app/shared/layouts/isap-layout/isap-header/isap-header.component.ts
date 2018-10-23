import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { UserService } from 'app/service/user.service';
import { CryptoService } from 'app/service/crypto.service';

@Component({
  selector: 'app-isap-header',
  templateUrl: './isap-header.component.html',
  styleUrls: ['./isap-header.component.css']
})
export class ISapHeaderComponent implements OnInit {
  username: string;
  usermail: string;

  @Output() notifySidebarStatus  = new EventEmitter();

  constructor(
    private userService: UserService,
    private cryptoService: CryptoService
  ) { }

  ngOnInit() {
    if (this.userService.currentUser) {
      this.username = this.cryptoService.decrypt4DB(this.userService.currentUser.attributes.username);
      this.usermail = this.userService.currentUser.attributes.email
        ? this.userService.currentUser.attributes.email : 'No Email';
    } else {
      this.username = 'Temporarily Admin';
      this.usermail = '';
    }
  }

  logout() {
    this.userService.logOut();
  }

}
