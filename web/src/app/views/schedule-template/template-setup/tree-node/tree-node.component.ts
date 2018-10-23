import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ITemplateSetupNode } from '../template-setup.component';

@Component({
  selector: 'app-tree-node',
  templateUrl: './tree-node.component.html',
  styleUrls: ['./tree-node.component.css']
})
export class TreeNodeComponent implements OnInit {
  @Input() treeNode = <ITemplateSetupNode>null;
  @Input() hasChild: boolean;
  @Output() changeSetupNodeEvent: EventEmitter<any> = new EventEmitter();

  constructor() { }

  ngOnInit() { }

  getListArrowClasses(): string[] {
    const classes = ['tree-node-fa', 'fa'];
    if (this.treeNode.collapsed) {
      classes.push('fa-angle-down');
    } else {
      classes.push('fa-angle-right');
    }
    return classes;
  }

  getListTextClasses() {
    const classes = ['tree-node'];

    if (this.treeNode.partialApply) {
      classes.push('tree-node-partial');
    } else {
      if (this.hasChild) {
        classes.push('tree-node-none-partial');
      } else {
        classes.push('tree-node-no-child');
      }
    }

    return classes;
  }

  changeSetupNode() {
    this.changeSetupNodeEvent.emit(this.treeNode);
  }

  getNodeName() {
    const level = this.treeNode.key.split('.').length;
    switch (level) {
      case 1: return `Main Group: ${this.treeNode.data.Name}`;
      case 2: return `Sub Group: ${this.treeNode.data.Name}`;
      case 3: return `Nvr: ${this.treeNode.data.Id} ${this.treeNode.data.Name}`;
      case 4: return `Channel: ${this.treeNode.data.Channel} ${this.treeNode.data.Name}`;
      case 5: return `Stream: ${this.treeNode.data.Id}`;
    }
  }

}
