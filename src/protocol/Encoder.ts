// src/protocol/Encoder.ts
import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

export class Encoder {
  static encode(text: string): string {
    const dataBinary = BinaryUtils.stringToBinary(text);
    const lengthBinary = text.length.toString(2).padStart(8, '0');

    let checksum = 0;
    for (let i = 0; i < text.length; i++) {
      checksum ^= text.charCodeAt(i);
    }
    const checksumBinary = checksum.toString(2).padStart(8, '0');

    return (
      // --- השינוי: פתיח "נדנדה" במקום שקט ---
      '1010101010101010' +      // Wake-up חזק (16 ביטים)
      SonicConfig.START_TOKEN + // Preamble
      lengthBinary +            
      dataBinary +              
      checksumBinary +          
      '000000000000'            // זנב ארוך לסיום בטוח
    );
  }
}