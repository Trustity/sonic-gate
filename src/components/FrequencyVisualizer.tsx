// src/components/FrequencyVisualizer.tsx
import React from 'react';
import { SonicConfig } from '../core/SonicConfig';

interface Props {
  currentFreq: number;
}

const TOLERANCE = SonicConfig.FREQ_TOLERANCE;

export const FrequencyVisualizer: React.FC<Props> = ({ currentFreq }) => {
  const isZero = Math.abs(currentFreq - SonicConfig.FREQ_ZERO) < TOLERANCE;
  const isOne = Math.abs(currentFreq - SonicConfig.FREQ_ONE) < TOLERANCE;

  return (
    <div className="mt-2 w-full rounded-xl border border-lab-border bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-32 items-end justify-between gap-2">
        <div className="flex flex-1 flex-col items-center gap-2">
          <div
            className={`w-full rounded-t-lg transition-all duration-100 ease-out ${
              isZero
                ? 'bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.45)]'
                : 'bg-lab-elevated'
            }`}
            style={{ height: isZero ? '100%' : '20%' }}
          />
          <span className="font-mono text-xs text-lab-dim">
            {SonicConfig.FREQ_ZERO} Hz
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg bg-lab-bg transition-all duration-300"
            style={{ height: '10%' }}
          />
          <span className="font-mono text-xs text-lab-dim/60">NOISE</span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2">
          <div
            className={`w-full rounded-t-lg transition-all duration-100 ease-out ${
              isOne ? 'bg-lab-accent shadow-accent' : 'bg-lab-elevated'
            }`}
            style={{ height: isOne ? '100%' : '20%' }}
          />
          <span className="font-mono text-xs text-lab-dim">
            {SonicConfig.FREQ_ONE} Hz
          </span>
        </div>
      </div>

      <div className="mt-4 text-center font-mono text-xs text-lab-muted">
        DETECTED:{' '}
        <span className="font-bold text-white">{Math.round(currentFreq)} Hz</span>
      </div>
    </div>
  );
};
