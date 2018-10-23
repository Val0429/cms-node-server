import { Injectable } from '@angular/core';
import * as crypto from 'crypto-js';
import { CryptoAttributes, CryptoConfig } from 'app/config/crypto.config';
import JsonHelper from 'app/helper/json.helper';

@Injectable()
export class CryptoService {
    jsonHelper = JsonHelper.instance;
    cryptoAttributes = CryptoAttributes;

    get iv() {
        return (<any>crypto).lib.WordArray.create([0, 0]);
    }

    encrypt(data: string, key: string = CryptoConfig.key): string {
        const dataBase64 = this.btoa(data);
        const keyWords = crypto.enc.Utf8.parse(key);
        const iv = this.iv;
        const encrypted = crypto.DES.encrypt(dataBase64, keyWords, { iv });
        return crypto.enc.Hex.stringify(encrypted.ciphertext);
    }

    decrypt(data: string, key: string): string {
        const keyWords = crypto.enc.Utf8.parse(key);
        const iv = this.iv;
        const ciphertext = crypto.enc.Hex.parse(data);
        const decrypted = crypto.DES.decrypt(<any>{ ciphertext }, keyWords, { iv });
        const ret = crypto.enc.Base64.parse(decrypted.toString(crypto.enc.Utf8)).toString(crypto.enc.Utf8);
        return crypto.enc.Base64.parse(decrypted.toString(crypto.enc.Utf8)).toString(crypto.enc.Utf8);
    }

    encrypt4DB(data: string, key: string = CryptoConfig.key): string {
        if (!data || data.length < 1) {
            return undefined;
        }
        const mode = crypto.mode.ECB;
        const padding = crypto.pad.ZeroPadding;
        const keyWords = crypto.enc.Utf8.parse(key);
        const encrypted = crypto.DES.encrypt(data, keyWords, {
            mode,
            padding,
        });
        return encrypted.toString();
    }

    decrypt4DB(data: string, key: string = CryptoConfig.key): string {
        if (!data || data.length < 1) {
            return undefined;
        }
        const mode = crypto.mode.ECB;
        const padding = crypto.pad.ZeroPadding;
        const keyWords = crypto.enc.Utf8.parse(key);
        const decrypted = crypto.DES.decrypt(data, keyWords, {
            mode,
            padding,
        });
        return decrypted.toString(crypto.enc.Utf8);
    }

    btoa(data: string): string {
        if ('undefined' !== typeof (window)) {
            return btoa(unescape(encodeURIComponent(data)));
        } else {
            return new Buffer(data).toString('base64');
        }
    }

    encryptAttr(obj, attr) {
        this.cryptProcess(obj, attr, this.encrypt4DB);
    }

    decryptAttr(obj, attr) {
        this.cryptProcess(obj, attr, this.decrypt4DB);
    }

    cryptProcess(obj, attr, cryptFunc) {
        for (let i = 0; i < attr.length; i++) {
            const attrDetail = attr[i].indexOf('.') < 0 ? [attr[i]] : attr[i].split('.');
            const columnParent = this.jsonHelper.findAttributeByArray({ json: obj, arr: attrDetail, returnParent: true });
            if (columnParent) {
                columnParent[attrDetail[attrDetail.length - 1]] = cryptFunc(columnParent[attrDetail[attrDetail.length - 1]]);
            }
        }
    }
}

declare function unescape(s: string);
