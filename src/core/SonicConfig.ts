// src/core/SonicConfig.ts

export const SonicConfig = {
  // הורדנו לתדרים שמיעים (כמו R2D2)
  FREQ_ZERO: 2000, 
  FREQ_ONE: 2500,  
  
  BAUD_RATE: 10, // האטנו קצת את הקצב
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  START_TOKEN: '10101010', 
};