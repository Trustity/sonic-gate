export type SpeedPreset = 'slow' | 'normal' | 'fast';

export const SPEED_PRESETS: Record<
  SpeedPreset,
  { baud: number; label: string; hint: string }
> = {
  slow: { baud: 3, label: 'Slow', hint: 'Noisy rooms · ~333 ms/bit' },
  normal: { baud: 6, label: 'Normal', hint: 'Default · ~167 ms/bit' },
  fast: { baud: 10, label: 'Fast', hint: 'Quiet room · ~100 ms/bit' },
};

export const SonicConfig = {
  FREQ_ZERO: 1500,
  FREQ_ONE: 3500,
  FREQ_TOLERANCE: 400,

  /** v2 extended sync marker (16 bits) — unlikely to collide with v1 length byte. */
  SYNC_TOKEN: '1010101010101010',
  SYNC_MARKER_V2: '1100110011001100',
  PROTOCOL_VERSION: 2,
  TAIL: '000000000000',

  /** Single sync on the wire keeps frames shorter for acoustic decode. */
  SYNC_REPEAT: 1,

  CHUNK_PAUSE_MS: 650,
  ACK_TIMEOUT_MS: 12_000,
  MAX_CHUNK_RETRIES: 3,

  _baudRate: SPEED_PRESETS.normal.baud,

  setPreset(preset: SpeedPreset) {
    this._baudRate = SPEED_PRESETS[preset].baud;
  },

  setBaudRate(baud: number) {
    this._baudRate = baud;
  },

  get BAUD_RATE() {
    return this._baudRate;
  },

  get BIT_DURATION() {
    return 1 / this._baudRate;
  },
};
