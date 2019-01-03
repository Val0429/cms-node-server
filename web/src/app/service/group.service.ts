import { Injectable } from '@angular/core';
import { Select2OptionData } from 'ng2-select2/ng2-select2';
import { Group } from 'app/model/core';
import { IGroupChannel } from 'lib/domain/core';

@Injectable()
export class GroupService {
    constructor() { }

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
    findDeviceGroup(groupConfigs: Group[], channelData: IGroupChannel): Group {
        const tempGroup = groupConfigs.find(x => x.Level === '1' && x.Channel
            && x.Channel.some(ch => ch.Nvr === channelData.Nvr && ch.Channel === channelData.Channel));
        return tempGroup;
    }

    
}

