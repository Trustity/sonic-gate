// src/protocol/Decoder.ts
import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

type DecoderState = 'IDLE' | 'SYNC' | 'READ_LENGTH' | 'READ_DATA' | 'CHECK';

export class Decoder {
  private state: DecoderState = 'IDLE';
  private buffer: string = '';
  private messageLength: number = 0;
  private pendingDataBinary: string = '';
  
  public onMessageDecoded: (msg: string) => void = () => {};
  public onProgress: (percent: number) => void = () => {};
  public onLog: (msg: string) => void = () => {};

  public processBit(bit: '0' | '1') {
    this.buffer += bit;

    switch (this.state) {
      case 'IDLE': {
        if (this.buffer.length > 32) this.buffer = this.buffer.slice(-24);
        const sync = SonicConfig.SYNC_TOKEN;
        if (this.buffer.length >= sync.length) {
          const tail = this.buffer.slice(-sync.length);
          const errors = tail.split('').filter((c, i) => c !== sync[i]).length;
          if (errors <= 2) {
            this.onLog(`🔹 SYNC OK! (${errors} err) Reading header...`);
            this.state = 'READ_LENGTH';
            this.buffer = '';
          }
        }
        break;
      }

      case 'READ_LENGTH':
        if (this.buffer.length === 8) {
          this.messageLength = parseInt(this.buffer, 2);
          this.onLog(`🔹 Expecting: ${this.messageLength} chars`);
          
          // הגנה מפני אורך לא הגיוני (זבל)
          if (this.messageLength === 0 || this.messageLength > 128) {
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
          this.onLog('🔹 Payload received. Checking...');
          this.pendingDataBinary = this.buffer.slice(0, targetBits);
          this.buffer = this.buffer.slice(targetBits);
          this.state = 'CHECK';
        }
        break;

      case 'CHECK':
        if (this.buffer.length >= 8) {
          const checksumReceived = parseInt(this.buffer.slice(0, 8), 2);
          try {
            const msg = BinaryUtils.binaryToString(this.pendingDataBinary);
            let checksumExpected = 0;
            for (let i = 0; i < msg.length; i++) checksumExpected ^= msg.charCodeAt(i);

            if (checksumReceived === checksumExpected) {
              this.onLog(`💡 Verified: "${msg}"`);
              this.onMessageDecoded(msg);
            } else {
              this.onLog(`⚠️ Checksum mismatch. Ignoring.`);
            }
          } catch {
            this.onLog('❌ Decode error');
          }
          this.reset();
        }
        break;
    }
  }

  private reset() {
    this.state = 'IDLE';
    this.buffer = '';
    this.messageLength = 0;
    this.pendingDataBinary = '';
    this.onProgress(0);
  }
}