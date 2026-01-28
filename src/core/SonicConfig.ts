// src/core/SonicConfig.ts

export const SonicConfig = {
  // תדרים חדשים, חזקים וברורים (כמו צליל חיוג)
  FREQ_ZERO: 1200, 
  FREQ_ONE:  1800, 
  
  BAUD_RATE: 5, 
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  START_TOKEN: '10101010', 
};