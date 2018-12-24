import { Injectable, group } from '@angular/core';
import { CoreService } from './core.service';
import { ParseService } from './parse.service';
import { Select2OptionData } from 'ng2-select2/ng2-select2';
import { Group } from 'app/model/core';
import { InsertHelper } from 'app/helper/insert.helper';
import { Observable } from 'rxjs/Observable';
import { observeOn } from 'rxjs/operator/observeOn';
import { IGroupChannel } from 'lib/domain/core';

@Injectable()
export class GroupService {
    constructor(private coreService: CoreService, private parseService: ParseService) { }

    /** 取得階層式Group選單內容 */
    getGroupOptions(groupConfigs: Group[]): Select2OptionData[] {
        const result: Select2OptionData[] = [];
        groupConfigs.filter(x => x.Level === '0').forEach(mg => {
            const item = { id: mg.id, text: mg.Name, children: [] };
            if (mg.SubGroup) {
                const subItems = groupConfigs.filter(x => mg.SubGroup.includes(x.id));
                subItems.forEach(sg => {
                    item.children.push({ id: sg.id, text: sg.Name });
                });
            }
            result.push(item);
        });
        return result;
    }

    /** 頁面: Camera, 功能: 找出Camera當前Group objectId */
    findDeviceGroup(groupConfigs: Group[], channelData: IGroupChannel): string {
        const tempGroup = groupConfigs.find(x => x.Level === '1' && x.Channel
            && x.Channel.some(ch => ch.Nvr === channelData.Nvr && ch.Channel === channelData.Channel));
        return tempGroup.id;
    }

    /** 頁面: NVR, 功能: 改變NVR group設定 */
    setNvrGroup(nvrId: string, newGroupId: string) {
        const getUpdateGroups$ = Observable.fromPromise(this.parseService.fetchData({
            type: Group,            
            filter: query => query
                .equalTo('Level', '1')
                .limit(30000)                
        })).map(result => {
            const groupConfigs = result;
            const saveList = [];

            groupConfigs.forEach(group => {
                if (group.Nvr === undefined) {
                    group.Nvr = [];
                }

                const index = group.Nvr.indexOf(nvrId);
                // contains NVR but not new group id => remove it
                if (index >= 0 && group.id !== newGroupId) {
                    group.Nvr.splice(index, 1);
                    saveList.push(group);
                }
                // is new group id but not contains NVR => insert it
                if (newGroupId !== undefined && group.id === newGroupId && index < 0) {
                    const insertIndex = InsertHelper.findInsertIndex(group.Nvr, nvrId);
                    group.Nvr.splice(insertIndex, 0, nvrId);
                    saveList.push(group);
                }
            });

            return saveList;
        });

        const save$ = (saveList: any[]) => Observable.fromPromise(Parse.Object.saveAll(saveList))
            .map(groups => this.coreService.notifyWithParseResult({ parseResult: groups, path: this.coreService.urls.URL_CLASS_GROUP }));

        return getUpdateGroups$
            .switchMap(saveList => save$(saveList));
    }

    /** 頁面: NVR, 功能: 移除Group內所設定的Nvr資料 */
    removeNvr(nvrId: string) {
        const deleteNvr$ = Observable.fromPromise(this.parseService.getData({
            type: Group,
            filter: query => query.contains('Nvr', nvrId)
        })).switchMap(group => {
            if (!group) {
                return Observable.of(null);
            }
            const index = group.Nvr.indexOf(nvrId);
            group.Nvr.splice(index, 1);
            return Observable.fromPromise(group.save());
        }).do(group => {
            if (group) {
                this.coreService.notifyWithParseResult({ parseResult: [group], path: this.coreService.urls.URL_CLASS_GROUP });
            }
        });

        return deleteNvr$;
    }

    /** 頁面: Camera, 功能: 改變Camera group設定 */
    setChannelGroup(groupConfigs: Group[], newData: IGroupChannel, newGroupId: string) {
        const saveList = [];
        
        
        groupConfigs.forEach(group => {
            if (group.Channel === undefined) {
                group.Channel = [];
            }
            const exists = group.Channel.find(x => x.Nvr === newData.Nvr && x.Channel === newData.Channel);
            // contains Channel but not new group id => remove it
            if (exists && group.id !== newGroupId) {
                const index = group.Channel.indexOf(exists);
                group.Channel.splice(index, 1);
                saveList.push(group);
            }
            // is new group id but not contains Channel => insert it
            if (newGroupId && group.id === newGroupId && !exists) {
                const insertIndex = InsertHelper.findInsertIndexForGroupChannel(group.Channel, newData);
                group.Channel.splice(insertIndex, 0, newData);
                saveList.push(group);
            }
        });
        

        return Observable.fromPromise(Parse.Object.saveAll(saveList)
            .then(groups => this.coreService.notifyWithParseResult({ parseResult: groups, path: this.coreService.urls.URL_CLASS_GROUP })));
    }
}

