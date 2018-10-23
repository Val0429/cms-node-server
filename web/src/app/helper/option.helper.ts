export const OptionHelper = {
    // 將key, value物件轉換成key, value陣列提供template選項
    getOptions(data: any) {
        const items = Object.keys(data).map(key => {
            const item = {
                key: key,
                value: data[key]
            };
            return item;
        });
        return items;
    }
};
export default OptionHelper;
