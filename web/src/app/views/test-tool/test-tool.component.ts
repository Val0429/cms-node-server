import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test-tool',
  templateUrl: './test-tool.component.html',
  styleUrls: ['./test-tool.component.css']
})
export class TestToolComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    this.promptCheck();
  }

  /** 詢問密碼，避免客戶誤用此功能 */
  promptCheck() {
    const inputPsw = prompt('Please enter verify code.', '');
    if (inputPsw !== 'ji3vu;3ul4z;4ru84') {
      this.router.navigate(['/']);
    }
  }

}
