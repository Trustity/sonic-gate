// src/core/SonicConfig.ts

export const SonicConfig = {
  // תדרים שמיעים (Audible) לבדיקה
  FREQ_ZERO: 2000, 
  FREQ_ONE: 2500,
  
  // קצב איטי מאוד כדי להתגבר על הדים בחדר
  BAUD_RATE: 5, 
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  // דגל התחלה
  START_TOKEN: '10101010', 
};