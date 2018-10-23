export const NumberHelper = {
    // 判斷字串是否為數字
    isNumber(data: string): boolean {
        return isNaN(Number(data)) ? false : true;
    }
};
export default NumberHelper;
