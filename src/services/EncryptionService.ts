import CryptoJS from 'crypto-js';
import { EncryptionConfig } from '../config/config';

export class EncryptionService {
    private key: string;
    private iv: string;

    constructor(config: EncryptionConfig) {
        this.key = config.key;
        this.iv = config.iv;
    }

    encrypt(text: string): string {
        const key = CryptoJS.enc.Utf8.parse(this.key);
        const iv = CryptoJS.enc.Utf8.parse(this.iv);
        
        const encrypted = CryptoJS.AES.encrypt(text, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        return encrypted.toString();
    }

    decrypt(encryptedText: string): string {
        const key = CryptoJS.enc.Utf8.parse(this.key);
        const iv = CryptoJS.enc.Utf8.parse(this.iv);
        
        const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
    }
}