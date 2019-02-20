export class JsonHelper {
    static get instance() {
        return this._instance || (this._instance = new this());
    }

    private static _instance: JsonHelper;

    constructor() { }
    // Find attribute inside json object child or grand-child..
    findAttribute(json: any, attr: string) {
        if (this.hasChild(json)) {
            Object.keys(json).forEach(key => {
                if (key === attr) {
                    return json[key];
                }
                const target = this.findAttribute(json[key], attr);
                if (target !== undefined) {
                    return target;
                }
            });
        }
        return undefined;
    }
    findAllAttribute(json: any, attr: string, result: any[]) {
        if (this.hasChild(json)) {
            Object.keys(json).forEach(key => {
                if (key.toLowerCase() === attr.toLowerCase()) {
                    let array = [];
                    switch (typeof json[key]) {
                        case 'string': array = String(json[key]).split(','); break;
                        default: array.push(json[key]); break;
                    }
                    array.forEach(item => {
                        if (result.indexOf(item) < 0) {
                            result.push(item);
                        }
                    });
                }
                if (Array.isArray(json[key])) {
                    json[key].forEach(element => {
                        this.findAllAttribute(element, attr, result);
                    });
                } else {
                    this.findAllAttribute(json[key], attr, result);
                }
            });
        }
    }
    hasAttribute(json: any, attr: string) {
        return json !== undefined && json[attr] !== undefined;
    }
    // Check if json object has any further child
    hasChild(json: any) {
        if (json === undefined || typeof json === 'string' || typeof json === 'number') {
            return false;
        }
        return Object.keys(json).length > 0;
    }
    // 在json物件中依照obj.attr[0].attr[1]...etc的方式往下尋找屬性, return 倒數第1層的物件內容
    // example: arr=['Config', 'Authentication', 'Account'], 若成功找到json.Config.Authentication.Account屬性, 就回傳Account物件
    findAttributeByArray(args: { json: any, arr: string[], index?: number, returnParent?: boolean }) {
        if (!args.index) {
            args.index = 0;
        }
        if (args.json === undefined) {
            return undefined;
        }
        if (!args.json[args.arr[args.index]]) {
            return undefined;
        }
        if (args.index < args.arr.length - 1) {
            return this.findAttributeByArray({
                json: args.json[args.arr[args.index]], arr: args.arr,
                index: args.index + 1, returnParent: args.returnParent
            });
        } else if (args.index === args.arr.length - 1) {
            return args.returnParent ? args.json : args.json[args.arr[args.index]];
        }
    }
    // 檢查指定字串的屬性是否存在，存在則回傳指定屬性內容
    findAttributeByString(json: any, str: string) {
        if(!json)return;
        if (str.indexOf('.') >= 0) {
            const seq = str.split('.');
            return this.findAttributeByArray({ json: json, arr: seq });
        } else {
            if (this.hasAttribute(json, str)) {
                return json[str];
            } else {
                return undefined;
            }
        }
    }
    // 檢查path中所有路徑，找到任何非undefined的物件即回傳
    findPathValue(data: any, paths: string[]) {
        let result: any;
        paths.forEach(path => {
            const node = path === '' ? data : this.findAttributeByString(data, path);
            if (node !== undefined && result === undefined) {
                result = node;
            }
        });
        return result;
    }
}
export default JsonHelper;
