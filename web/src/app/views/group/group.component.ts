import { Component, OnInit } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { Observable } from 'rxjs/Observable';
import { Group } from 'app/model/core';
import { GroupService } from 'app/service/group.service';
import { InsertHelper } from 'app/helper/insert.helper';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css']
})
export class GroupComponent implements OnInit {
  groupList: Group[];
  mainGroups: Group[] = [];
  subGroups: Group[] = [];
  selectedMainGroup: Group;
  /** 目前編輯的ParseObject Group */
  currentEditData: Group;
  /** 目前顯示在畫面上編輯的Group Model */
  editDataModel: IGroupEditModel;
  constructor(private coreService: CoreService, 
    private parseService: ParseService) { }

  ngOnInit() {
    this.reloadGroupData();
  }

  /** 重新讀取資料並刷新displayArray */
  reloadGroupData() {
    this.parseService.fetchData({
      type: Group,      
      filter: query => query.limit(30000)
      .ascending("Name")
    }).then(groups => {
      this.groupList = groups;
      this.refreshDisplayArray();
      this.editDataModel = undefined;
    });
  }

  /** 將Group資料處理成兩階層 */
  refreshDisplayArray() {
    this.mainGroups = [];
    this.subGroups = [];
    this.groupList.filter(x => x.Level === '0').forEach(mg => {
      this.mainGroups.push(mg);
      const sgList: string[] = mg.SubGroup || [];
      this.subGroups[mg.id] = this.groupList.filter(gp => sgList.includes(gp.id));
    });
    const sameMG = this.mainGroups.find(x => x.id === this.selectedMainGroup.id);
    if (sameMG) {
      this.selectedMainGroup = sameMG;
    }
  }

  /** 將目前編輯Group內容放到Model */
  setEditData(data: Group) {
    this.currentEditData = data;
    this.editDataModel = {
      Name: data.Name,
      Level: data.Level,
      SubGroup: data.SubGroup,
      Nvr: data.Nvr,
      Channel: data.Channel
    };
  }

  /** Modal點擊儲存事件 */
  clickModalSave() {
    const group = this.currentEditData || new Group();
    if(this.editDataModel.Name =="Non Main Group" || this.editDataModel.Name =="Non Sub Group"){
      alert("Invalid group name!")
      return;
    }
    group.Name = this.editDataModel.Name;
    group.Level = this.editDataModel.Level;
    group.SubGroup = this.editDataModel.SubGroup;
    group.Nvr = this.editDataModel.Nvr;
    group.Channel = this.editDataModel.Channel;

    group.save().then(gp => {
      this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_GROUP, objectId: gp.id });
      const updateMainGroup$ = gp.Level === '1' ? this.updateMainGroup(this.selectedMainGroup, gp) : Observable.of(null);
      updateMainGroup$.subscribe(() => {
        this.coreService.notify();
        this.reloadGroupData();
      });
    });
  }

  /** Modal點擊刪除事件 */
  clickModalDelete() {
    if (!confirm('Are you sure to delete ' + this.editDataModel.Name + '?')) return;
    let noGroup = this.groupList.find(x=>x.Name=="Non Sub Group");
    //move channel and nvr to "Non Sub Group"
    if(this.currentEditData.Nvr){      
      for(let nvrId of this.currentEditData.Nvr){
        if(!noGroup.Nvr)noGroup.Nvr=[];
        const insertIndex = InsertHelper.findInsertIndex(noGroup.Nvr, nvrId);
        noGroup.Nvr.splice(insertIndex, 0, nvrId);        
      }
    }
    if(this.currentEditData.Channel){
      for(let cam of this.currentEditData.Channel){
        if(!noGroup.Channel)noGroup.Channel=[];
        const insertIndex = InsertHelper.findInsertIndexForGroupChannel(noGroup.Channel, cam);
        noGroup.Channel.splice(insertIndex, 0, cam);
      }      
    }
    const deleteGroup$ = Observable.fromPromise(this.currentEditData.destroy().then(res=> noGroup.save())
      .then(group => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_GROUP, objectId: group.id })));
    deleteGroup$
      .switchMap(() => this.updateSubGroupOfMain(this.currentEditData))
      .switchMap(() => this.removeSubGroupsByMain(this.currentEditData))
      .do(() => this.coreService.notify())
      .subscribe(() => {
        if (this.editDataModel.Level === '0') {
          this.selectedMainGroup = undefined;
        } else {
          this.selectedMainGroup = this.mainGroups.find(x => x.id === this.selectedMainGroup.id);
        }
        this.reloadGroupData();
      });
    
  }

  /** 更新DB中mainGroup底下的subGroup集合 */
  updateMainGroup(mainGroup: Group, subGroup: Group) {
    if (!mainGroup.SubGroup) {
      mainGroup.SubGroup = [];
    }
    if (!mainGroup.SubGroup.some(x => x === subGroup.id)) {
      mainGroup.SubGroup.push(subGroup.id);
      return Observable.fromPromise(mainGroup.save()
        .then(mg => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_GROUP, objectId: mg.id })));
    }
    return Observable.of(null);
  }

  /** 判斷若Group是Main，就找到所有對應的subGroup從DB移除 */
  removeSubGroupsByMain(mainGroup: Group) {
    if (mainGroup.Level === '0') {
      return Observable.fromPromise(this.parseService.fetchData({
        type: Group,
        filter: query => query.containedIn('objectId', mainGroup.SubGroup)
      }).then(subGroups => Parse.Object.destroyAll(subGroups))
        .then(sgs => {
          sgs.forEach(sg => {
            this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_GROUP, objectId: sg.id });
          });
        }));
    }
    return Observable.of(null);
  }

  /** 判斷若Group是Sub，就找到對應mainGroup，DB更新該mainGroup的subGroup資料 */
  updateSubGroupOfMain(subGroup: Group) {
    if (subGroup.Level === '1') {
      const mainGroup = this.mainGroups.find(x => x.SubGroup.indexOf(subGroup.id) >= 0);
      if (mainGroup) {
        const index = mainGroup.SubGroup.indexOf(subGroup.id);
        mainGroup.SubGroup.splice(index, 1);
        return Observable.fromPromise(mainGroup.save()
          .then(mg => this.coreService.addNotifyData({ path: this.coreService.urls.URL_CLASS_GROUP, objectId: mg.id })));
      }
      return Observable.of(null);
    }
    return Observable.of(null);
  }

  // 取得空白Group物件用來新增
  getNewGroupObject(level: string): IGroupEditModel {
    if (level === '0') {
      return {
        Name: 'New Main Group',
        Level: level,
        SubGroup: []
      };
    } else if (level === '1') {
      return {
        Name: 'New Sub Group',
        Level: level,
        Nvr: [],
        Channel: []
      };
    } else {
      return null;
    }
  }
}

interface IGroupEditModel {
  Name: string;
  Level: string;
  SubGroup?: string[]; // sub group objectId
  Nvr?: string[]; // Nvr.Id
  Channel?: { // IP Camera, Nvr always be 0
    Nvr: string;
    Channel: number;
  }[];
}
