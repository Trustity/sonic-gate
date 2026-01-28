// src/core/SonicConfig.ts

export const SonicConfig = {
  // הרחקנו את התדרים משמעותית!
  FREQ_ZERO: 2000, 
  FREQ_ONE:  3000, // היה 2500
  
  // קצב איטי ובטוח
  BAUD_RATE: 5, 
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  START_TOKEN: '10101010', 
};