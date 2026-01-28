// src/protocol/Decoder.ts
import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

type DecoderState = 'IDLE' | 'SYNC' | 'READ_LENGTH' | 'READ_DATA' | 'CHECK';

export class Decoder {
  private state: DecoderState = 'IDLE';
  private buffer: string = '';
  private messageLength: number = 0;
  
  public onMessageDecoded: (msg: string) => void = () => {};
  public onProgress: (percent: number) => void = () => {};
  // הוספנו יכולת לוגים גם לדיקודר
  public onLog: (msg: string) => void = () => {};

  public processBit(bit: '0' | '1') {
    this.buffer += bit;

    switch (this.state) {
      case 'IDLE':
        // מחפש את ה-Start Token
        if (this.buffer.endsWith(SonicConfig.START_TOKEN)) {
          this.onLog('🔹 SYNC FOUND! Reading length...');
          this.state = 'READ_LENGTH';
          this.buffer = '';
        }
        break;

      case 'READ_LENGTH':
        if (this.buffer.length === 8) {
          this.messageLength = parseInt(this.buffer, 2);
          this.onLog(`🔹 Length detected: ${this.messageLength} chars`);
          
          if (this.messageLength === 0 || this.messageLength > 20) {
            this.onLog('⚠️ Invalid length, resetting.');
            this.reset();
          } else {
            this.state = 'READ_DATA';
            this.buffer = '';
          }
        }
        break;

      case 'READ_DATA':
        const targetBits = this.messageLength * 8;
        const progress = Math.round((this.buffer.length / targetBits) * 100);
        this.onProgress(progress);

        if (this.buffer.length >= targetBits) {
          this.onLog('🔹 Data read complete. Verifying Checksum...');
          const rawData = this.buffer;
          this.state = 'CHECK'; 
          this.buffer = rawData; // שומרים את המידע בצד
        }
        break;
        
      case 'CHECK':
         // כרגע אנחנו לא קוראים את ה-Checksum באמת אלא מיד מציגים
         // (בשלב הבא נוסיף את הקריאה של ה-8 ביטים הנוספים)
         const message = BinaryUtils.binaryToString(this.buffer);
         this.onLog(`✅ SUCCESS: ${message}`);
         this.onMessageDecoded(message);
         this.reset();
         break;
    }
  }

  private reset() {
    this.state = 'IDLE';
    this.buffer = '';
    this.messageLength = 0;
    this.onProgress(0);
  }
}