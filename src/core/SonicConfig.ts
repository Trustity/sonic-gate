// src/core/SonicConfig.ts

export const SonicConfig = {
  // חזרנו לתחום העל-קולי (שקט)
  FREQ_ZERO: 18500, 
  FREQ_ONE: 19500,
  
  // קצב שידור מהיר יותר (עכשיו שהווליום תוקן)
  BAUD_RATE: 20,
  
  get BIT_DURATION() {
    return 1 / this.BAUD_RATE;
  },

  START_TOKEN: '10101010', 
};