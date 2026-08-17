/** Single-bin Goertzel magnitude for FSK tone detection. */
export function goertzelMagnitude(
  samples: Float32Array,
  sampleRate: number,
  targetFreq: number,
): number {
  const k = Math.round(0.5 + (samples.length * targetFreq) / sampleRate);
  const w = (2 * Math.PI * k) / samples.length;
  const coeff = 2 * Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < samples.length; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - s1 * s2 * coeff;
  return Math.sqrt(Math.max(0, power));
}

export function detectFskBit(
  samples: Float32Array,
  sampleRate: number,
  freqZero: number,
  freqOne: number,
  minRatio = 1.25,
): '0' | '1' | null {
  const e0 = goertzelMagnitude(samples, sampleRate, freqZero);
  const e1 = goertzelMagnitude(samples, sampleRate, freqOne);
  const peak = Math.max(e0, e1);
  if (peak < 0.008) return null;
  if (e0 > e1 * minRatio) return '0';
  if (e1 > e0 * minRatio) return '1';
  return null;
}
