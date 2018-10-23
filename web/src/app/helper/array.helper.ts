export const ArrayHelper = {
    // 判斷字串是否為數字
    toArray(data: any) {
        if (!data || Array.isArray(data)) {
            return data;
        } else {
            const tmp = data;
            const result = [];
            result.push(tmp);
            return result;
        }
    },
    split(data: any, splitChar: string) {
        return String(data).split(splitChar);
    },
    sortString(data: string[]) {
        data.sort(function (a, b) {
            return (a > b) ? 1 : ((b > a) ? -1 : 0);
        });
    },
    sortObject(data: any[], attr: string) {
        data.sort(function (a, b) {
            return (a[attr] > b[attr]) ? 1 : ((b[attr] > a[attr]) ? -1 : 0);
        });
    },
    deleteItem(data: any[], attr: string, val: string) {
        const item = data.find(x => String(x[attr]) === val);
        if (item) {
            const index = data.indexOf(item);
            if (index >= 0) {
                data.splice(index, 1);
            }
        }
    },
    combineArray(arr1: any[], arr2: any[]) {
        // arr1 = arr1.concat(arr2.filter(v => !arr1.includes(v)));
        arr2.forEach(item => {
            if (!arr1.includes(item)) {
                arr1.push(item);
            }
        });
    },
    isEqual(arr1: any[], arr2: any[]): boolean {
        let result = true;
        if (arr1 === undefined || arr2 === undefined) {
            result = false;
        }
        if (arr1.length !== arr2.length) {
            result = false;
        }
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
                result = false;
            }
        }
        return result;
    }
};
export default ArrayHelper;
