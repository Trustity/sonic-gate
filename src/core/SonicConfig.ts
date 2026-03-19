// src/core/SonicConfig.ts

export const SonicConfig = {
  // הפרדה קיצונית - אי אפשר לפספס
  FREQ_ZERO: 1500, 
  FREQ_ONE:  3500, 
  
  // קצב איטי ליציבות (3 = 333ms לביט)
  BAUD_RATE: 3, 
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  START_TOKEN: '10101010',
  /** Full 16-bit sync - avoids false sync on wake-up pattern */
  SYNC_TOKEN: '1010101010101010',
};