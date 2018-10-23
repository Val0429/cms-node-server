import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { General } from 'app/model/core';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-joystick',
  templateUrl: './joystick.component.html',
  styleUrls: ['./joystick.component.css']
})
export class JoystickComponent implements OnInit {
  generalSetting: General;
  constructor(private coreService: CoreService, private parseService: ParseService) { }

  ngOnInit() {
    this.getGeneral().subscribe();
  }

  getGeneral() {
    return Observable.fromPromise(this.parseService.getData({
      type: General
    })).map(result => {
      this.generalSetting = result;
    });
  }

  clickSaveConfig() {
    if (!this.generalSetting) {
      return;
    }
    Observable.fromPromise(this.generalSetting.save())
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: [result], path: this.coreService.urls.URL_CLASS_GENERAL
      }))
      .toPromise()
      .then(() => alert('Update success.'))
      .catch(alert);
  }
}
