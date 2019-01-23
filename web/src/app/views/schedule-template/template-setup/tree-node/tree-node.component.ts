import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ITemplateSetupNode } from '../template-setup.component';
import { Device } from 'app/model/core';
import { CameraService } from 'app/service/camera.service';

@Component({
  selector: 'app-tree-node',
  templateUrl: './tree-node.component.html',
  styleUrls: ['./tree-node.component.css']
})
export class TreeNodeComponent implements OnInit {
  @Input() treeNode = <ITemplateSetupNode>null;
  @Input() hasChild: boolean;
  @Output() changeSetupNodeEvent: EventEmitter<any> = new EventEmitter();
  @Output() checkParentEvent: EventEmitter<any> = new EventEmitter();

  constructor(private cameraService:CameraService) { }

  async ngOnInit() { 
    const level = this.treeNode.level;
    if(!this.treeNode.data && level==4){
      let dev = await this.cameraService.getCameraPrimaryData(this.treeNode.nvrId, this.treeNode.channelId);
      if(!dev){
        dev = new Device();
        dev.Name = "Device not found";        
      }      
      this.treeNode.name=`Channel: ${dev.Channel} ${dev.Name}`;
      this.treeNode.data = dev;      
      // 若是RecordSchedule額外多處理stream
      if (dev.Config.Stream && this.treeNode.setupMode === 1) {
        dev.Config.Stream.filter(x => x.Id < 3).sort(function (a, b) {
          return (a.Id > b.Id) ? 1 : ((b.Id > a.Id) ? -1 : 0);
        }).forEach(str => {          
          const newStrNode: ITemplateSetupNode = {
            name:`Stream: ${str.Id}`,
            level: 5, data: str, apply: false, partialApply: false, collapsed: true, child: [], streamId:str.Id, 
            nvrId: this.treeNode.nvrId, channelId:dev.Channel, enabled:true, parent:this.treeNode, setupMode:this.treeNode.setupMode
          };
          this.treeNode.child.push(newStrNode);
          this.treeNode.checkChecked();
        });
      }
    }
  }

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

  clickNode($event:any) {
    this.changeSetupNodeEvent.emit({node:this.treeNode, $event});
    this.checkParentEvent.emit({node:this.treeNode});
  }

  

}
