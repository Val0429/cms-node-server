import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { CoreService } from 'app/service/core.service';
import { ParseService } from 'app/service/parse.service';
import { LicenseService } from 'app/service/license.service';
import * as _ from 'lodash';
import { Group, Nvr, Device, RecordSchedule, EventHandler } from 'app/model/core';
import { Observable } from 'rxjs/Observable';
import { IRecordScheduleTemplate, IEventScheduleTemplate } from 'lib/domain/core';

@Component({
  selector: 'app-template-setup',
  templateUrl: './template-setup.component.html',
  styleUrls: ['./template-setup.component.css']
})



export class TemplateSetupComponent implements OnInit, OnChanges {
  
  @Input() setupMode: number;
  /** RecordScheduleTemplate or EventScheduleTemplate */
  @Input() currentTemplate: IRecordScheduleTemplate | IEventScheduleTemplate ;
  setupNode: ITemplateSetupNode[]; // 階層資料集合
  setupModes = {
    RECORD_SCHEDULE_TEMPLATE: 1,
    EVENT_TEMPLATE: 2
  };  /** table RecordSchedule or EventHandler的資料 */
  
  setupData: SetupData[];
  ipCameraNvr: Nvr;
  flag = {
    load: false,
    save: false
  };
  pageSize:number=20;

  /** 依照當前setupMode取得相對應config url */
  get notifyPath() {
    switch (this.setupMode) {
      case this.setupModes.RECORD_SCHEDULE_TEMPLATE:
        return this.coreService.urls.URL_CLASS_RECORDSCHEDULE;
      case this.setupModes.EVENT_TEMPLATE:
        return this.coreService.urls.URL_CLASS_EVENTHANDLER;
    }
  }
  /** 依照當前setupMode取得level層數上限 */
  get levelLimit() {
    switch (this.setupMode) {
      case this.setupModes.RECORD_SCHEDULE_TEMPLATE: return 5;
      case this.setupModes.EVENT_TEMPLATE: return 4;
    }
  }
  constructor(
    private coreService: CoreService,
    private parseService: ParseService,
    private licenseService: LicenseService
  ) { }

  ngOnInit() {
    this.getIPCameraNvr()
      .switchMap(() => this.fetchBasicData())
      .subscribe();
      
  }

  async ngOnChanges(changes: SimpleChanges){
    if (changes.setupMode) {
      this.setupMode = changes.setupMode.currentValue;
    }
    if (changes.currentTemplate) {
      this.currentTemplate = changes.currentTemplate.currentValue;
      await this.fetchSetupData().toPromise();  
    }
  }

  getIPCameraNvr() {
    const getNvr$ = Observable.from(this.parseService.getData({
      type: Nvr,
      filter: query => query.matches('Driver', new RegExp('IPCamera'), 'i')
    })).map(nvr => this.ipCameraNvr = nvr);
    return getNvr$;
  }

  /** 讀取Group, Nvr, Device等基本資料 */
  fetchBasicData() {
    const fetchGroup$ = Observable.fromPromise(this.parseService.fetchData({
      type: Group,
      filter: query => query
      .ascending("Name")
      .limit(30000)
    }));
    const fetchNvr$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,      
      filter: query => query.limit(30000).ascending("SequenceNumber")
    }));

    return Observable.combineLatest(
      fetchGroup$, fetchNvr$,
      (groups, nvrs) => {        
        let nonGroupIndex = groups.findIndex(x=>x.Level=="0" && x.Name=="Non Main Group");
        let nonGroup = groups[nonGroupIndex];
        groups.splice(nonGroupIndex, 1);
        groups.push(nonGroup);
        this.buildSetupNodes({ groupConfigs: groups, nvrConfigs: nvrs });
      }
    );
  }

  /** 依照setupMode取得不同的設定資料集合 */
  fetchSetupData():Observable<any> {
    this.flag.load = true;
    this.setupData = undefined;
    let fetch$;
    switch (this.setupMode) {
      case this.setupModes.RECORD_SCHEDULE_TEMPLATE:
        fetch$ = Observable.fromPromise(this.parseService.fetchData({
          type: RecordSchedule,
          filter: query => query
            // .include('ScheduleTemplate')
            .equalTo('ScheduleTemplate', this.currentTemplate)
            .limit(30000)
        }));
        break;
      case this.setupModes.EVENT_TEMPLATE:
        fetch$ = Observable.fromPromise(this.parseService.fetchData({
          type: EventHandler,
          filter: query => query            
            .limit(30000)
          // EventTemplate比較特殊，必須先判斷指定的Device是否有先設EventHandler，故此處把資料全撈
        }));
        break;
    }

    if (!fetch$) {
      return Observable.of(null);
    }

    return fetch$
      .map(result => {        

        this.setupData = [];
        for(let data of result){          
          
          let checked = this.setupMode==this.setupModes.RECORD_SCHEDULE_TEMPLATE 
            || (data as EventHandler).Schedule == (this.currentTemplate as IEventScheduleTemplate).Schedule;

          let originalShedule = this.setupMode==this.setupModes.EVENT_TEMPLATE ? (data as EventHandler).Schedule : "";

          this.setupData.push({checked, data, originalShedule});
        }
        console.debug("this.setupData", this.setupData);
      })
      .do(() => 
        this.initApplyValue()
      );
  }

  /** 檢查目前RecordSchedule/EventHandler，調整最底層node.Apply屬性 */
  initApplyValue() {
    if (!this.setupNode || !this.setupData || !this.currentTemplate) {
      return;
    }
    // 目前Template模式指定level的所有節點
    const targetData = this.getSetupNodeWithLevel();
    
    if (this.setupMode === this.setupModes.RECORD_SCHEDULE_TEMPLATE) {      
        this.setupData.forEach(recordSchedule => {          
          let recordData = (recordSchedule.data as RecordSchedule);
          const foundNode = targetData.find(nodeTarget => nodeTarget.nvrId == recordSchedule.data.NvrId && nodeTarget.channelId == recordData.ChannelId);
          if (foundNode) {
            let foundStream = foundNode.checkedStreamId.find(x=>x == recordData.StreamId);
            if(!foundStream){
              foundNode.checkedStreamId.push(recordData.StreamId);
            }            
            foundNode.apply = true;
            foundNode.partialApply = true;
            foundNode.checkChecked();
          }          
        });
    }

    if (this.setupMode === this.setupModes.EVENT_TEMPLATE) {
      this.setupData
        //.filter(x => (x.data as EventHandler).Schedule == (this.currentTemplate as IEventScheduleTemplate).Schedule)
        .forEach(eventHandler => {          
          const foundNode = targetData.find(nodeTarget => nodeTarget.nvrId == eventHandler.data.NvrId && nodeTarget.channelId == (eventHandler.data as EventHandler).DeviceId); // key前加上點避免錯誤          
          if (foundNode) {
            foundNode.apply = eventHandler.checked;
            foundNode.partialApply = eventHandler.checked;
            foundNode.enabled = true;
          }
        });
    }

    this.associateApply();
  }

  /** 從最上層或指定node開始，向下調整 */
  associateApply(node?: ITemplateSetupNode) {
    const loopTarget = node ? node.child : this.setupNode;
    loopTarget.forEach(childNode => {
      if (childNode.level !== this.levelLimit) {
        if (childNode.child.length > 0) {
          this.associateApply(childNode);
          childNode.apply = childNode.child.filter(x => x.apply).length === childNode.child.length;
          childNode.partialApply = childNode.child.some(x => x.apply || x.partialApply);
        }
      }
    });
    this.flag.load = false;
  }

  /** 建立階層式物件集合
   * Mode: RecordScheduleTemplate由上到下個別為: MainGroup, SubGroup, Nvr, Camera, Stream
   * Mode: EventTemplate由上到下個別為: MainGroup, SubGroup, Nvr, Camera
  */
  buildSetupNodes(args: { groupConfigs: Group[], nvrConfigs: Nvr[] }) {
    this.setupNode = [];
    // 從MainGroup開始層層往下新增節點
    args.groupConfigs.filter(x => x.Level === '0').forEach(mg => {

      const newMgNode: ITemplateSetupNode = {
        name:`Main Group: ${mg.Name}`,
        id:mg.id, level: 1, data: mg, apply: false, partialApply: false, collapsed: true, child: [],
        enabled:true, parent:undefined, setupMode:this.setupMode
      };
      this.setupNode.push(newMgNode);

      if (mg.SubGroup) {
        args.groupConfigs.filter(group => mg.SubGroup.includes(group.id)).forEach(sg => {
          const newSgNode: ITemplateSetupNode = {
            name:`Sub Group: ${sg.Name}`,
            id:sg.id, level: 2, data: sg, apply: false, partialApply: false, collapsed: true, child: [], 
            enabled:true, parent:newMgNode, setupMode:this.setupMode,
          };
          newMgNode.child.push(newSgNode);

          // 若SubGroup有Channel(直連), 將隸屬此Group的直連Device資料一起處理
          if (sg.Channel && sg.Channel.length > 0) {
            const channelsId = sg.Channel.map(x => x.Channel);
            this.buildSetupNodeForNvrDev({
              sg: newSgNode,              
              nvr: this.ipCameraNvr,
              sgIpCamChannel: channelsId
            });
          }

          // 若SubGroup有Nvr, 將所有Nvr及其底下的Device資料一起處理
          if (sg.Nvr && sg.Nvr.length > 0) {
            args.nvrConfigs.filter(x => sg.Nvr.includes(x.Id)).forEach(async nvr => {
              let devs = await Observable.fromPromise(this.parseService
                .fetchData({type:Device, 
                  filter:query => query.equalTo("NvrId", nvr.Id)
                })).toPromise();
              this.buildSetupNodeForNvrDev({ sg: newSgNode, nvr, sgIpCamChannel: devs.map(function(e){return e.Channel}) });
            });
          }
        });
      }
    });
  }

  

  /** 加入Nvr及底下內容至樹狀圖 */
  buildSetupNodeForNvrDev(args: { sg: ITemplateSetupNode, nvr: Nvr, sgIpCamChannel?: number[] }) {
    // 加入一般Nvr或直連用的預設虛擬Nvr
    const newNvrNode: ITemplateSetupNode = {
      name:`Nvr: ${args.nvr.Id} ${args.nvr.Name}`,
      id:args.nvr.id, level: 3, data: args.nvr, apply: false, partialApply: false, collapsed: true, child: [], page:1, 
        nvrId:args.nvr.Id, enabled:true, parent:args.sg, setupMode:this.setupMode
    };
    args.sg.child.push(newNvrNode);
    
    args.sgIpCamChannel.forEach(dev => {
      
      // set data to undefined to let tree node load the data directly from parse server
      // implement lazy load
      const newDevNode: ITemplateSetupNode = {
        name: `Channel: ${dev}`,
        level: 4, data: undefined, apply: false, partialApply: false, collapsed: true, child: [],
        nvrId:args.nvr.Id, channelId:dev, enabled:true, parent:newNvrNode, setupMode:this.setupMode, checkedStreamId:[]
      };

      newDevNode.checkChecked = ()=>{
        for(let str of newDevNode.child){
          let checked = newDevNode.checkedStreamId.find(x=>x == str.streamId) != undefined;
          str.apply = checked;
          str.partialApply= checked;
        }
      }

      newNvrNode.child.push(newDevNode);      
    });
  }

  /** 取得指定節點的level */
  getSetupNodeLevel(key: string): number {
    return key.split('.').length;
  }

  /** 找尋所有指定level的node */
  getSetupNodeWithLevel():ITemplateSetupNode[] {
    let result = [];
    for(let mg of this.setupNode){
      for(let sg of mg.child){
        for(let nvr of sg.child){
          for(let dev of nvr.child){
            //reset all nodes            
            dev.enabled = false;      
            dev.apply = false;
            dev.partialApply = false;                        
            if(this.setupMode == this.setupModes.RECORD_SCHEDULE_TEMPLATE){              
              dev.checkedStreamId=[];
              dev.enabled=true;
              for(let str of dev.child){
                str.enabled = true;      
                str.apply = false;
                str.partialApply = false;
                str.checkedStreamId=[];                
              }
            }
            result.push(dev);            
          }
        }
      }
    }
    
    return result;
  }

  /** 打勾或取消單一節點後，修改其child節點
   * 由treeNode callback時參數val一律undefined，進行遞迴設定時才指定參數val */
  

  clickSave() {
    if (!this.setupNode) {
      return;
    }

    this.flag.save = true;
    this.saveTemplateSetup()
      .toPromise()
      .then(() => this.flag.save = false)
      .catch(alert);
  }

  changeSetupNode(obj:{node: ITemplateSetupNode, $event: any}) {    
    let checked:boolean = obj.$event.target.checked;
    //console.debug("old item", this.getExistSetupData(node))
    console.debug("changeSetupNode node", obj.node);
    console.debug("changeSetupNode val", checked); 

    let oldItem = this.getExistSetupData(obj.node);
    if(oldItem==undefined){
      if(this.setupMode == this.setupModes.RECORD_SCHEDULE_TEMPLATE && obj.node.level==this.levelLimit){
        oldItem = { checked, data: this.createNewRecordSchedule(obj.node), originalShedule:""};
        this.setupData.push(oldItem);
      }
      else if(this.setupMode == this.setupModes.EVENT_TEMPLATE){                
        alert("Event setup is necessary");
        obj.$event.preventDefault();
        return;
      }
    }else{    
      oldItem.checked=checked;    
    }
    
    console.debug("oldItem", oldItem);

    // 修改目前node本身的值
    obj.node.apply = checked;
    obj.node.partialApply = checked;
    // 若非最底層則找出所有child一起修改
    if (obj.node.level !== this.levelLimit) {
      obj.node.child.forEach(cn => {
        this.changeSetupNode({node:cn, $event: obj.$event});
      });
    }     
     this.associateApply();    
  }
  


  /** 依照目前setupNode的狀況取得應新增, 修改, 刪除資料的task */
  saveTemplateSetup() {
    const alertMessage = [];
    
    let lic = this.setupMode === this.setupModes.RECORD_SCHEDULE_TEMPLATE ? '00168' : 'pass';      
    
    if (alertMessage.length > 0) {
      alert(alertMessage.join('\n'));
      return Observable.of(null);
    }

    return this.licenseService.getLicenseAvailableCount(lic)
      .switchMap(num => {
        console.debug("num", num);
        if (num < (this.setupData.filter(x=>x.checked).length)) {
          alert('License available count is not enough, did not save template setup.');
          return Observable.of(null);
        }  

        if(this.setupMode == this.setupModes.EVENT_TEMPLATE){                     
          return this.saveEventHandler();              
        }
        else{
          return this.saveRecordSchedule();
        }
          
      })      
      .do(async ()=>{
        alert('Update Success.');
        await this.fetchSetupData().toPromise();  
      });
  }

  private saveEventHandler() {    

    let deleteEvent = this.setupData.filter(x=> x.checked !== true && 
      x.originalShedule == (this.currentTemplate as IEventScheduleTemplate).Schedule)
    .map(function(e){ 
      (e.data as EventHandler).Schedule = "";
      return e.data;
    });
    
    const delete$ = Observable.fromPromise(Parse.Object.saveAll(deleteEvent))
    .map(result => {
      this.coreService.notifyWithParseResult({
        parseResult: result, path: this.notifyPath
      });
    });
    let schedule = (this.currentTemplate as IEventScheduleTemplate).Schedule;
    let saveEvent = this.setupData.filter(x=>x.checked === true).map(function (e) { 
      (e.data as EventHandler).Schedule = schedule;
      return e.data; 
    });    
    
    console.debug("saveEvent", saveEvent);
    console.debug("deleteEvent", deleteEvent);

    const save$ = Observable.fromPromise(Parse.Object.saveAll(saveEvent))
      .map(result => {
        this.coreService.notifyWithParseResult({
          parseResult: result, path: this.notifyPath
        });
      });
    return delete$.switchMap(()=>save$);
  }

  private saveRecordSchedule() {
    let saveSchedule = [];
    let deleteSchedule = [];
    for (let item of this.setupData) {
      if (item.checked === true) {
        saveSchedule.push(item.data);
      }
      else {
        deleteSchedule.push(item.data);
      }
    }
    console.debug("saveSchedule", saveSchedule);
    console.debug("deleteSchedule", deleteSchedule);
    //save checked schedules
    const save$ = Observable.fromPromise(Parse.Object.saveAll(saveSchedule))
      .map(result => {
        this.coreService.notifyWithParseResult({
          parseResult: result, path: this.notifyPath
        });
      });
    //destroy all existing schedules
    const delete$ = Observable.fromPromise(Parse.Object.destroyAll(deleteSchedule))
      .map(result => this.coreService.notifyWithParseResult({
        parseResult: result, path: this.notifyPath
      }));
    return delete$.switchMap(() => save$);
  }

  /** 檢查db當前資料, 檢查此node是否有套用template */
  getExistSetupData(node: ITemplateSetupNode) {
    if (this.setupMode === this.setupModes.RECORD_SCHEDULE_TEMPLATE) {
      const result = this.setupData.find(x => x.data.NvrId === node.nvrId &&
        (x.data as RecordSchedule).ChannelId === node.channelId && 
        (x.data as RecordSchedule).StreamId === node.streamId)
      return result;
    }
    if (this.setupMode === this.setupModes.EVENT_TEMPLATE) {
      const result = this.setupData.find(x => x.data.NvrId === node.nvrId &&
        (x.data as EventHandler).DeviceId === node.channelId);
      return result;
    }
  }

  /** 若現有資料中不存在，則取得新的RecordSchedule物件 */
  createNewRecordSchedule(node: ITemplateSetupNode) {    
    const newObj = new RecordSchedule({
      NvrId: node.nvrId,
      ChannelId: node.channelId,
      StreamId: node.streamId,
      ScheduleTemplate: this.currentTemplate as IRecordScheduleTemplate
    });
    return newObj;
  }

  getULCollapseClasses(collapsed: boolean): string[] {
    const classes = ['collapse'];
    if (!collapsed) {
      classes.push('show');
    }
    return classes;
  }

  /** 開展所有節點 */
  clickExpandAll() {
    this.setupNode.forEach(node => {
      this.setNodeCollapse(node, false);
    });
  }

  clickCollapseAll() {
    this.setupNode.forEach(node => {
      this.setNodeCollapse(node, true);
    });
  }

  setNodeCollapse(node: ITemplateSetupNode, collapse: boolean) {
    node.collapsed = collapse;
    if (node.child) {
      node.child.forEach(ch => {
        this.setNodeCollapse(ch, collapse);
      });
    }
  }
}
export interface SetupData {checked:boolean, data: RecordSchedule | EventHandler, originalShedule:string}

export interface ITemplateSetupNode {
  /* to implement lazy load */
  parent:ITemplateSetupNode;
  setupMode:number;
  checkedStreamId?:number[];
  id?:string;
  //changed to number since version 3.0.25
  level: number;
  /*
    example of wrong node found if we try to find templateSetupNode by key.indexOf(): 
      1.1.2 == 1.1.21  
      1.1.21 == 1.1.211
      etc.
  */
  channelId?:number;
  nvrId?:string;
  streamId?:number;

  /* to disable empty event  */
  enabled:boolean;

  /** 任意型態資料 */
  data: any;
  /** 表示單一節點或者其所有child是否套用某template */
  apply: boolean;
  /** 表示單一節點的child是否有部分套用template */
  partialApply: boolean;
  /** layout is collapsed */
  collapsed: boolean;
  /** 本節點底下的child */
  child: ITemplateSetupNode[];
  /* for pagination current page */
  page?:number;
  name:string

  checkChecked?();
}
