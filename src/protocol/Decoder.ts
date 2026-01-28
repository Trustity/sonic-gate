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
  public onLog: (msg: string) => void = () => {};

  public processBit(bit: '0' | '1') {
    this.buffer += bit;

    switch (this.state) {
      case 'IDLE':
        // מחפשים את הדגל
        if (this.buffer.endsWith(SonicConfig.START_TOKEN)) {
          this.onLog('🔹 SYNC OK! Reading header...');
          this.state = 'READ_LENGTH';
          this.buffer = '';
        }
        break;

      case 'READ_LENGTH':
        if (this.buffer.length === 8) {
          this.messageLength = parseInt(this.buffer, 2);
          this.onLog(`🔹 Expecting: ${this.messageLength} chars`);
          
          // הגנה מפני אורך לא הגיוני (זבל)
          if (this.messageLength === 0 || this.messageLength > 50) {
            this.onLog(`⚠️ Weird length (${this.messageLength}), resetting.`);
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
          this.onLog('🔹 Payload received. Decoding...');
          
          // --- שינוי: מנסים לפענח מיד, לפני ה-Checksum ---
          try {
            const rawMessage = BinaryUtils.binaryToString(this.buffer);
            this.onLog(`💡 Raw Content: "${rawMessage}"`);
            
            // אנחנו מוותרים על בדיקת ה-Checksum הקשוחה כרגע
            // ומציגים את ההודעה בכל מקרה
            this.onMessageDecoded(rawMessage);
            this.reset();
            
          } catch (e) {
            this.onLog('❌ Binary Error');
            this.reset();
          }
        }
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