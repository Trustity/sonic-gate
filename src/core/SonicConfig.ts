// src/core/SonicConfig.ts

export const SonicConfig = {
  // נשארים בתדרים השמיעים לבדיקה (אח"כ נחזיר ל-18k)
  FREQ_ZERO: 2000, 
  FREQ_ONE: 2500,
  
  // --- השינוי הקריטי: מאיטים ל-5 ביטים בשנייה ---
  BAUD_RATE: 5, 
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  START_TOKEN: '10101010', 
};