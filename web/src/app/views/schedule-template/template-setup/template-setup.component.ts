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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.setupMode) {
      this.setupMode = changes.setupMode.currentValue;
    }
    if (changes.currentTemplate) {
      this.currentTemplate = changes.currentTemplate.currentValue;
      this.fetchSetupData()        
        .subscribe();
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
      filter: query => query.limit(30000)
    }));
    const fetchNvr$ = Observable.fromPromise(this.parseService.fetchData({
      type: Nvr,
      filter: query => query.limit(30000)
    }));
    const fetchDevice$ = Observable.fromPromise(this.parseService.fetchData({
      type: Device,
      filter: query => query.ascending('Channel').limit(30000)
    }));

    return Observable.combineLatest(
      fetchGroup$, fetchNvr$, fetchDevice$,
      (response1, response2, response3) => {
        // Nvr先以Id排序
        response2.sort(function (a, b) {
          return (Number(a.Id) > Number(b.Id)) ? 1 : ((Number(b.Id) > Number(a.Id)) ? -1 : 0);
        });
        this.buildSetupNodes({ groupConfigs: response1, nvrConfigs: response2, deviceConfigs: response3 });
        this.buildSetupNodeForNonGroup({ groupConfigs: response1, nvrConfigs: response2, deviceConfigs: response3 });
      }
    );
  }

  /** 依照setupMode取得不同的設定資料集合 */
  fetchSetupData() {
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
      .do(() => this.initApplyValue());
  }

  /** 檢查目前RecordSchedule/EventHandler，調整最底層node.Apply屬性 */
  initApplyValue() {
    if (!this.setupNode || !this.setupData || !this.currentTemplate) {
      return;
    }

    // 目前Template模式指定level的所有節點
    const targetData = this.getSetupNodeWithLevel(this.levelLimit);
    targetData.forEach(node => {
      node.apply = false;
      node.partialApply = false;
      node.enabled = this.setupMode == this.setupModes.RECORD_SCHEDULE_TEMPLATE
    });

    if (this.setupMode === this.setupModes.RECORD_SCHEDULE_TEMPLATE) {
      // this.setupData.filter((x: RecordSchedule) => x.ScheduleTemplate.id === this.currentTemplate.id)
      
        this.setupData.forEach(x => {
          const key = x.data.NvrId + '.' + (x.data as RecordSchedule).ChannelId + '.' +(x.data as RecordSchedule).StreamId;
          const data = targetData.find(node => node.key.indexOf('.' + key) >= 0); // key前加上點避免錯誤
          if (data) {
            data.apply = true;
            data.partialApply = true;
          }
        });
    }

    if (this.setupMode === this.setupModes.EVENT_TEMPLATE) {
      this.setupData
        //.filter(x => (x.data as EventHandler).Schedule == (this.currentTemplate as IEventScheduleTemplate).Schedule)
        .forEach(x => {          
          const data = targetData.find(node => node.nvrId == x.data.NvrId && node.channelId == (x.data as EventHandler).DeviceId); // key前加上點避免錯誤          
          data.apply = x.checked;
          data.partialApply = x.checked;
          data.enabled = true;
        });
    }

    this.associateApply();
  }

  /** 從最上層或指定node開始，向下調整 */
  associateApply(node?: ITemplateSetupNode) {
    const loopTarget = node ? node.child : this.setupNode;
    loopTarget.forEach(childNode => {
      if (this.getSetupNodeLevel(childNode.key) !== this.levelLimit) {
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
  buildSetupNodes(args: { groupConfigs: Group[], nvrConfigs: Nvr[], deviceConfigs: Device[] }) {
    this.setupNode = [];
    // 從MainGroup開始層層往下新增節點
    args.groupConfigs.filter(x => x.Level === '0').forEach(mg => {
      const newMgNode: ITemplateSetupNode = {
        key: mg.id, data: mg, apply: false, partialApply: false, collapsed: true, child: [], page:1, nvrId:"0", channelId:0,
        enabled:true
      };
      this.setupNode.push(newMgNode);
      if (mg.SubGroup) {
        args.groupConfigs.filter(group => mg.SubGroup.includes(group.id)).forEach(sg => {
          const newSgNode: ITemplateSetupNode = {
            key: `${newMgNode.key}.${sg.id}`, data: sg, apply: false, partialApply: false, collapsed: true, child: [], page:1, nvrId:"0", channelId:0,
            enabled:true
          };
          newMgNode.child.push(newSgNode);

          // 若SubGroup有Channel(直連), 將隸屬此Group的直連Device資料一起處理
          if (sg.Channel && sg.Channel.length > 0) {
            const channelsId = sg.Channel.map(x => x.Channel);
            this.buildSetupNodeForNvrDev({
              sg: newSgNode,
              deviceConfigs: args.deviceConfigs,
              nvr: this.ipCameraNvr,
              sgIpCamChannel: channelsId
            });
          }

          // 若SubGroup有Nvr, 將所有Nvr及其底下的Device資料一起處理
          if (sg.Nvr) {
            args.nvrConfigs.filter(x => sg.Nvr.includes(x.Id)).forEach(nvr => {
              this.buildSetupNodeForNvrDev({ sg: newSgNode, deviceConfigs: args.deviceConfigs, nvr: nvr });
            });
          }
        });
      }
    });
  }

  /** 加入無Group的Nvr及IPCamera到樹狀圖 */
  buildSetupNodeForNonGroup(args: { groupConfigs: Group[], nvrConfigs: Nvr[], deviceConfigs: Device[] }) {
    // 未設定group的Nvr及IPCamera所使用的虛擬group
    const xMg = new Group({ Name: 'NonMainGroup', Level: '0', SubGroup: [] });
    const xSg = new Group({ Name: 'NonSubGroup', Level: '1', Nvr: [], Channel: [] });

    const newMgNode: ITemplateSetupNode = {
      key: 'xMg', data: xMg, apply: false, partialApply: false, collapsed: true, child: [], page:1, nvrId:"0", channelId:0,
      enabled:true
    };
    this.setupNode.push(newMgNode);
    const newSgNode: ITemplateSetupNode = {
      key: `${newMgNode.key}.xSg`, data: xSg, apply: false, partialApply: false, collapsed: true, child: [], page:1, nvrId:"0", channelId:0,
      enabled:true
    };
    newMgNode.child.push(newSgNode);

    // Channel裡面有至少一筆紀錄的subGroups
    const subGroups = args.groupConfigs.filter(group => group.Level === '1');

    // 先找出所有包含在Group的IPCamera, 再以此過濾出沒有Group的部分
    const groupedIPCam = _.flatMap(
      subGroups.filter(group => group.Channel && group.Channel.length > 0)
        .map(sg => sg.Channel));
    const xIPCam = args.deviceConfigs
      .filter(dev => dev.NvrId === this.ipCameraNvr.Id)
      .filter(dev => !groupedIPCam.some(cam => dev.Channel === cam.Channel));

    this.buildSetupNodeForNvrDev({
      sg: newSgNode, deviceConfigs: args.deviceConfigs, nvr: this.ipCameraNvr, sgIpCamChannel: xIPCam.map(x => x.Channel)
    });

    // 先找出所有包含在Group的Nvr, 再以此過濾出沒有Group的部分
    const groupedNvr = _.flatMap(
      subGroups.filter(group => group.Nvr && group.Nvr.length > 0)
        .map(sg => sg.Nvr));
    const xNvrs = args.nvrConfigs
      .filter(nvr => nvr.id !== this.ipCameraNvr.id)
      .filter(nvr => !groupedNvr.some(nvrId => nvr.Id === nvrId)); // 篩選出沒有Group的Nvr

    xNvrs.forEach(nvr => {
      this.buildSetupNodeForNvrDev({ sg: newSgNode, deviceConfigs: args.deviceConfigs, nvr: nvr });
    });
  }

  /** 加入Nvr及底下內容至樹狀圖 */
  buildSetupNodeForNvrDev(args: { sg: ITemplateSetupNode, deviceConfigs: Device[], nvr: Nvr, sgIpCamChannel?: number[] }) {
    // 加入一般Nvr或直連用的預設虛擬Nvr
    const newNvrNode: ITemplateSetupNode = {
      key: `${args.sg.key}.${args.nvr.Id}`, data: args.nvr, apply: false, partialApply: false, collapsed: true, child: [], page:1, 
        nvrId:args.nvr.Id, channelId:0, enabled:true
    };
    args.sg.child.push(newNvrNode);
    // 找出屬於此Nvr的Camera
    let devQuery = args.deviceConfigs.filter(x => x.NvrId === args.nvr.Id);
    // 若目標是IPCamera, 過濾出屬於當前SubGroup的IPCamera
    if (args.sgIpCamChannel) {
      devQuery = devQuery.filter(x => args.sgIpCamChannel.includes(x.Channel)).sort(function (a, b) {
        return (a.Channel > b.Channel) ? 1 : ((b.Channel > a.Channel) ? -1 : 0);
      });
    }
    devQuery.forEach(dev => {
      
      const newDevNode: ITemplateSetupNode = {
        key: `${newNvrNode.key}.${dev.Channel}`, data: dev, apply: false, partialApply: false, collapsed: true, child: [], page:1,
        nvrId:args.nvr.Id, channelId:dev.Channel, enabled:true
      };
      newNvrNode.child.push(newDevNode);
      // 若是RecordSchedule額外多處理stream
      if (dev.Config.Stream && this.setupMode === this.setupModes.RECORD_SCHEDULE_TEMPLATE) {
        dev.Config.Stream.filter(x => x.Id < 3).sort(function (a, b) {
          return (a.Id > b.Id) ? 1 : ((b.Id > a.Id) ? -1 : 0);
        }).forEach(str => {
          const newStrNode: ITemplateSetupNode = {
            key: `${newDevNode.key}.${str.Id}`, data: str, apply: false, partialApply: false, collapsed: true, child: [], page:1,
            nvrId:args.nvr.Id, channelId:dev.Channel, enabled:true
          };
          newDevNode.child.push(newStrNode);
        });
      }
    });
  }

  /** 取得指定節點的level */
  getSetupNodeLevel(key: string): number {
    return key.split('.').length;
  }

  /** 找尋所有指定level的node */
  getSetupNodeWithLevel(level: number, node?: ITemplateSetupNode):ITemplateSetupNode[] {
    const targetNodes = node ? node.child : this.setupNode;
    let result = [];
    if (!targetNodes || targetNodes.length === 0) {
      return result;
    }
    if (this.getSetupNodeLevel(targetNodes[0].key) === level) {
      return targetNodes;
    }

    targetNodes.forEach(ch => {
      const ns = this.getSetupNodeWithLevel(level, ch);
      if (ns.length > 0) {
        result = result.concat(ns);
      }
    });
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
      if(this.setupMode == this.setupModes.RECORD_SCHEDULE_TEMPLATE){
        oldItem = { checked, data: this.createNewRecordSchedule(obj.node), originalShedule:""};
        this.setupData.push(oldItem);
      }
      else {                
        alert("Event setup is necessary");
        obj.$event.preventDefault();
        return;
      }
    }
    
    oldItem.checked=checked;    
    console.debug("oldItem", oldItem);

    // 修改目前node本身的值
    obj.node.apply = checked;
    obj.node.partialApply = checked;
    // 若非最底層則找出所有child一起修改
    if (this.getSetupNodeLevel(obj.node.key) !== this.levelLimit) {
      obj.node.child.forEach(cn => {
        this.changeSetupNode({node:cn, $event: obj.$event});
      });
    }     
     this.associateApply();    
  }
  


  /** 依照目前setupNode的狀況取得應新增, 修改, 刪除資料的task */
  saveTemplateSetup() {
    const alertMessage = [];

    let lic ='pass';
    if (this.setupMode === this.setupModes.RECORD_SCHEDULE_TEMPLATE) {
      lic = '00168';
    }
    
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
      .do(()=>{
        alert('Update Success.');
        this.fetchSetupData().subscribe();
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
    const levelLimit = this.levelLimit;
    const seq = node.key.split('.');
    console.debug("seq", seq);
    if (this.setupMode === this.setupModes.RECORD_SCHEDULE_TEMPLATE) {
      const result = this.setupData.find(x => x.data.NvrId === seq[levelLimit - 3] &&
        (x.data as RecordSchedule).ChannelId === parseInt(seq[levelLimit - 2]) && 
        (x.data as RecordSchedule).StreamId === parseInt(seq[levelLimit - 1]));
      return result;
    }
    if (this.setupMode === this.setupModes.EVENT_TEMPLATE) {
      const result = this.setupData.find(x => x.data.NvrId === seq[levelLimit - 2] &&
        (x.data as EventHandler).DeviceId === Number(seq[levelLimit - 1]));
      return result;
    }
  }

  /** 若現有資料中不存在，則取得新的RecordSchedule物件 */
  createNewRecordSchedule(node: ITemplateSetupNode) {
    const indexStart = 2;
    const seq = node.key.split('.');
    const newObj = new RecordSchedule({
      NvrId: seq[indexStart],
      ChannelId: Number(seq[indexStart + 1]),
      StreamId: Number(seq[indexStart + 2]),
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
  /** 階層式key, format: MGID.SGID.NVRID.DEVICEID.(STREAMID) */
  key: string;
  /*
    example of wrong node found if we try to find templateSetupNode by key.indexOf(): 
      1.1.2 == 1.1.21  
      1.1.21 == 1.1.211
      etc.
  */
  channelId:number;
  nvrId:string;
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
  page:number;
}
