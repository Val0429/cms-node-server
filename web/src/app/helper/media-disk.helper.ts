export const MediaDiskHelper = {
    /** 換算Bytes到適當單位 */
    countBytes(bytes: string): string {
        const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        let l = 0, n = parseInt(bytes, 10) || 0;
        while (n >= 1024) {
            n = n / 1024;
            l++;
        }
        return (n.toFixed(n >= 10 || l < 1 ? 0 : 1) + ' ' + units[l]);
    },
    /** 計算硬碟使用量 */
    countUsageSpace(disk: any): string {
        if (!disk) {
            return '0';
        }
        const usageBytes = Number(disk.TotalBytes) - Number(disk.FreeBytes);
        return this.countBytes(usageBytes.toString());
    },
    /** 計算硬碟使用量百分比 */
    countUsagePercent(disk: any): string {
        if (!disk) {
            return '0';
        }
        const totalBytes = Number(disk.TotalBytes);
        const usageBytes = totalBytes - Number(disk.FreeBytes);
        return Math.round((usageBytes / totalBytes) * 100).toString();
    }
};
export default MediaDiskHelper;
