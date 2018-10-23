import { OnInit, Component, Input, ElementRef } from '@angular/core';
import { IsapSidebarService } from 'app/service/layouts/isap-layout/isap-sidebar.service';
import { UserService } from 'app/service/user.service';

@Component({
  selector: 'app-isap-sidebar',
  templateUrl: './isap-sidebar.component.html',
  styleUrls: ['./isap-sidebar.component.css']
})
export class ISapSidebarComponent implements OnInit {

  @Input() isStaticSidebar = true;

  @Input() isMouseInSidebar = false;
  /** 如果 是 Static 模式 且 滑鼠沒有移入 Sidebar 時，應收合選單 */
  get isInStaticAndMouseIn() {
    return this.isStaticSidebar ? false : !this.isMouseInSidebar;
  }

  constructor(
    protected isapSidebarService: IsapSidebarService,
    private userService: UserService
  ) { }

  ngOnInit() { }

  checkPagePermission(page: string): boolean {
    return this.userService.isAllowConfigPage(page);
  }
}
