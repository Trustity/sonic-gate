// src/core/SonicConfig.ts

export const SonicConfig = {
  // התדרים שבחרנו - גבוהים מספיק כדי לא להישמע, נמוכים מספיק למיקרופון רגיל
  FREQ_ZERO: 18500, // מייצג ביט 0
  FREQ_ONE: 19500,  // מייצג ביט 1
  
  // קצב שידור (Bits Per Second).
  // נתחיל ב-20 ביט לשנייה לטובת אמינות. בהמשך ננסה להעלות.
  BAUD_RATE: 20,
  
  // חישוב עזר: כמה זמן נמשך כל ביט בשניות
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  // התווים המיוחדים לפרוטוקול
  START_TOKEN: '10101010', // Preamble - ליישור שעון
};