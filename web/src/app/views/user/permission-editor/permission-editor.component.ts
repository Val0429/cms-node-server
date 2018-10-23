import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { UserGroup } from 'app/model/core';

@Component({
  selector: 'app-permission-editor',
  templateUrl: './permission-editor.component.html',
  styleUrls: ['./permission-editor.component.css']
})
export class PermissionEditorComponent implements OnInit, OnChanges {
  /** UserGroup資料 */
  @Input() currentConfig: UserGroup;
  constructor() { }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentConfig) {
      this.currentConfig = changes.currentConfig.currentValue;
    }
  }
}
