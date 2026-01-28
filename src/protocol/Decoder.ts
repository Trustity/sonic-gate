// src/protocol/Decoder.ts
import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

type DecoderState = 'IDLE' | 'SYNC' | 'READ_LENGTH' | 'READ_DATA' | 'CHECK';

export class Decoder {
  private state: DecoderState = 'IDLE';
  private buffer: string = ''; // אוגר את הביטים שנכנסים
  private messageLength: number = 0;
  private lastBitTime: number = 0;
  
  // Callback כשמתקבלת הודעה מלאה ותקינה
  public onMessageDecoded: (msg: string) => void = () => {};
  // Callback לעדכון התקדמות (אופציונלי, ל-UI)
  public onProgress: (percent: number) => void = () => {};

  constructor() {}

  /**
   * הפונקציה הזו נקראת בכל פעם שהמקלט מזהה ביט חדש (0 או 1)
   */
  public processBit(bit: '0' | '1') {
    // אנחנו מוסיפים את הביט לזרם הנתונים
    this.buffer += bit;

    // ניהול המכונה לפי המצב הנוכחי
    switch (this.state) {
      case 'IDLE':
        // מחפשים את ה-Start Token (הדגל) בתוך הבאפר האחרון
        if (this.buffer.endsWith(SonicConfig.START_TOKEN)) {
          console.log('[Decoder] SYNC DETECTED! Starting reception...');
          this.state = 'READ_LENGTH';
          this.buffer = ''; // מנקים את הבאפר כדי לקלוט נקי מעכשיו
        }
        break;

      case 'READ_LENGTH':
        // מחכים שיהיו לנו 8 ביטים (בית אחד) שמייצגים את האורך
        if (this.buffer.length === 8) {
          this.messageLength = parseInt(this.buffer, 2);
          console.log(`[Decoder] Expecting message length: ${this.messageLength} chars`);
          
          if (this.messageLength === 0) {
            this.reset(); // הודעה ריקה? לא הגיוני, איפוס
          } else {
            this.state = 'READ_DATA';
            this.buffer = '';
          }
        }
        break;

      case 'READ_DATA':
        // כל תו הוא 8 ביטים. אנחנו מחכים שיהיה לנו (אורך * 8) ביטים
        const targetBits = this.messageLength * 8;
        
        // עדכון פרוגרס בר ל-UI
        const progress = Math.round((this.buffer.length / targetBits) * 100);
        this.onProgress(progress);

        if (this.buffer.length >= targetBits) {
          const rawData = this.buffer;
          // עוברים לבדיקת Checksum
          this.state = 'CHECK'; 
          this.buffer = rawData; // שומרים את המידע בצד
        }
        break;
        
      case 'CHECK':
         // כרגע נקרא עוד 8 ביטים של ה-Checksum
         // לצורך הפשטות בשלב ראשון - נדלג על האימות המתמטי ופשוט נציג את ההודעה
         // בפרודקשן מלא היינו קוראים עוד 8 ביטים ומשווים
         
         const message = BinaryUtils.binaryToString(this.buffer);
         console.log(`[Decoder] DECODED: ${message}`);
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