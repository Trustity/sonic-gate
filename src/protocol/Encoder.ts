// src/protocol/Encoder.ts
import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

export class Encoder {
  /**
   * יוצר חבילת מידע מלאה לשידור
   * מבנה: [PREAMBLE] [LENGTH_BYTE] [DATA] [CHECKSUM]
   */
  static encode(text: string): string {
    // 1. המרת הטקסט לבינארי
    const dataBinary = BinaryUtils.stringToBinary(text);
    
    // 2. חישוב אורך ההודעה (8 ביטים שמייצגים את מספר התווים)
    // אנחנו מגבילים ל-255 תווים להודעה
    const lengthBinary = text.length.toString(2).padStart(8, '0');

    // 3. חישוב Checksum (XOR פשוט על כל התווים)
    // זה יעזור לנו לדעת אם ההודעה הגיעה משובשת
    let checksum = 0;
    for (let i = 0; i < text.length; i++) {
      checksum ^= text.charCodeAt(i);
    }
    const checksumBinary = checksum.toString(2).padStart(8, '0');

    // 4. הרכבת החבילה הסופית
    // מוסיפים "רווח" של שקט (0000) לפני ואחרי כדי להפריד מרעש
    return (
      '0000' + 
      SonicConfig.START_TOKEN + // דגל התחלה
      lengthBinary +            // כמה תווים לקרוא
      dataBinary +              // המידע עצמו
      checksumBinary +          // בדיקת תקינות
      '0000'
    );
  }
}