// src/protocol/Encoder.ts
import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

export class Encoder {
  /**
   * יוצר חבילת מידע מלאה לשידור
   * מבנה: [WAKE_UP] [PREAMBLE] [LENGTH_BYTE] [DATA] [CHECKSUM] [COOLDOWN]
   */
  static encode(text: string): string {
    // 1. המרת הטקסט לבינארי
    const dataBinary = BinaryUtils.stringToBinary(text);
    
    // 2. חישוב אורך ההודעה (8 ביטים)
    const lengthBinary = text.length.toString(2).padStart(8, '0');

    // 3. חישוב Checksum (XOR) לבדיקת תקינות
    let checksum = 0;
    for (let i = 0; i < text.length; i++) {
      checksum ^= text.charCodeAt(i);
    }
    const checksumBinary = checksum.toString(2).padStart(8, '0');

    // 4. הרכבת החבילה הסופית
    return (
      '00000000' +              // Wake-up: נותן למקלט זמן להתאפס על התדר
      SonicConfig.START_TOKEN + // Preamble: דגל התחלה
      lengthBinary +            // Header: אורך ההודעה
      dataBinary +              // Payload: המידע עצמו
      checksumBinary +          // Integrity: בדיקת תקינות
      '0000'                    // Cooldown: שקט בסוף
    );
  }
}