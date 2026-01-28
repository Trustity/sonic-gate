// src/core/SonicConfig.ts

export const SonicConfig = {
  // הפרדה קיצונית - אי אפשר לפספס
  FREQ_ZERO: 1500, 
  FREQ_ONE:  3500, 
  
  // קצב איטי
  BAUD_RATE: 5, 
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  START_TOKEN: '10101010', 
};