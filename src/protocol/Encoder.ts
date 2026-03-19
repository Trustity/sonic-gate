// src/protocol/Encoder.ts
import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

const MAX_LENGTH = 128;

export class Encoder {
  static encode(text: string): string {
    const cleaned = text.slice(0, MAX_LENGTH).replace(/[^\x20-\x7E]/g, '?');
    const dataBinary = BinaryUtils.stringToBinary(cleaned);
    const lengthBinary = cleaned.length.toString(2).padStart(8, '0');

    let checksum = 0;
    for (let i = 0; i < cleaned.length; i++) {
      checksum ^= cleaned.charCodeAt(i);
    }
    const checksumBinary = checksum.toString(2).padStart(8, '0');

    return (
      SonicConfig.SYNC_TOKEN +  // Sync 16-bit (אין צורך ב-preamble נוסף)
      lengthBinary +
      dataBinary +
      checksumBinary +
      '000000000000'            // זנב לסיום בטוח
    );
  }
}