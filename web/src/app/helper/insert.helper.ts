import { IGroupChannel } from 'app/model/group';

export const InsertHelper = {
    sort(data: any[], key: string) {
        data.sort(function(a, b) {
            return a[key] - b[key];
        });
    },
    // 在data當中依照特定key找出新增時應給予的值, ex: [0, 1, 2, 4, 5] return 3
    findInsertId(data: any[], key: string, start: number) {
        let result = 1;
        if (!data) {
            return result.toString();
        }

        if (start) { // custom start
            result = start;
        }

        this.sort(data, key);

        for (let i = 0; i < data.length; i++) {
            if (+(data[i][key]) > result) {
                return result.toString();
            } else {
                result++;
            }
        }
        return result.toString();
        // let startIndex = 0;
        // if (start) {
        //     startIndex = start;
        // }
        // if (!data) {
        //     return startIndex.toString();
        // }

        // data.sort(function(a, b) {
        //     return a[key] - b[key];
        // });

        // for (let i = startIndex; i < data.length; i++) {
        //     if (+(data[i][key]) > i) {
        //         return i.toString();
        //     }
        // }
        // return (data.length).toString();
    },
    // For Group.NVR
    findInsertIndex(data: string[], insertNum: string): number {
        let insertIndex = 0;
        while (insertIndex < data.length) {
          if (+(insertNum) < +(data[insertIndex])) {
            break;
          } else {
            insertIndex++;
          }
        }
        return insertIndex;
        // for (let i = 0; i < data.length; i++) {
        //     if (Number(data[i]) > Number(insertNum)) {
        //         return i;
        //     }
        // }
        // return data.length;
    },
    findInsertIndexForGroupChannel(data: IGroupChannel[], insertData: IGroupChannel) {
        let insertIndex = 0;
        while (insertIndex < data.length) {
            if (insertData.Nvr === data[insertIndex].Nvr && +(insertData.Channel) < +(data[insertIndex].Channel)) {
                break;
            } else {
                insertIndex++;
            }
        }
        return insertIndex;
    }
};
export default InsertHelper;
