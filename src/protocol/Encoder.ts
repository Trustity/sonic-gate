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
      '00000000' +              // Wake-up (התחלה)
      SonicConfig.START_TOKEN + 
      lengthBinary +            
      dataBinary +              
      checksumBinary +          
      '0000000000'              // --- השינוי: זנב ארוך יותר (10 אפסים) ---
    );
  }
}