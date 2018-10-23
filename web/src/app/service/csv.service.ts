import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable()
export class CSVService {

    constructor() { }

    /** 將參數內容轉為csv檔讓user下載
     * header: csv第一行內容，作為各欄位的標題使用 ex: 'Time,Type,Server Name,Description'
     * data: csv第二行之後的內容
     * fileName: 下載檔名稱 ex: 'Log_Export'
     * timestamp: 下載檔名稱的timestamp格式 ex: 'YYYY-MM-DD HHmmss'
     */
    downloadCSV(args: { header: string, data: string[], fileName: string, timestamp?: string }) {
        const header = `${args.header}\n`;
        const blob = new Blob(['\ufeff' + header + args.data.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const isSafariBrowser = navigator.userAgent.indexOf('Safari') > -1
            && navigator.userAgent.indexOf('Chrome') < 0;
        const dwldLink = document.createElement('a');
        if (isSafariBrowser) {
            dwldLink.setAttribute('target', '_blank');
        }

        const exportName = `${args.fileName}${args.timestamp ? ' ' + moment(new Date()).format(args.timestamp) : ''}.csv`;

        dwldLink.setAttribute('href', url);
        dwldLink.setAttribute('download', exportName);
        dwldLink.style.visibility = 'hidden';
        document.body.appendChild(dwldLink);
        dwldLink.click();
        document.body.removeChild(dwldLink);
    }

}
