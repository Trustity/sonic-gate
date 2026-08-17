import { useState } from 'react';
import { Decoder } from '../protocol/Decoder';
import { Encoder } from '../protocol/Encoder';
import { SonicConfig, type SpeedPreset } from '../core/SonicConfig';
import type { LiveStatus } from './LiveStatusBar';

type Props = {
  speedPreset: SpeedPreset;
  onLog: (msg: string) => void;
  onStatus: (status: LiveStatus) => void;
};

export function LoopbackPanel({ speedPreset, onLog, onStatus }: Props) {
  const [input, setInput] = useState('HELLO');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const runLoopback = () => {
    const text = input.trim();
    if (!text || running) return;
    setRunning(true);
    setOutput('');
    onStatus({
      label: 'Running loopback…',
      detail: 'Software encode → decode (no audio)',
      tone: 'active',
    });

    SonicConfig.setPreset(speedPreset);
    const decoder = new Decoder();
    let decoded = false;

    decoder.onLog = (m) => onLog(`[loopback] ${m}`);
    decoder.onMessageDecoded = (msg) => {
      decoded = true;
      setOutput(msg);
      onLog(`[loopback] result: ${msg}`);
      onStatus({
        label: 'Loopback passed',
        detail: `Decoded "${msg}"`,
        tone: 'success',
      });
    };

    const bits = Encoder.bitsForLoopback(text);
    onLog(`[loopback] feeding ${bits.length} bits`);

    for (const bit of bits) {
      if (bit === '0' || bit === '1') decoder.processBit(bit);
    }

    if (!decoded) {
      onStatus({
        label: 'Loopback failed',
        detail: 'Frame did not decode — open logs for SYNC / CRC details',
        tone: 'error',
      });
      onLog('[loopback] decode failed');
    }

    setRunning(false);
  };

  return (
    <div className="rounded-xl border border-lab-border bg-lab-card p-5 sm:p-6">
      <label className="mb-3 block text-[10px] font-bold tracking-[0.2em] text-lab-dim">
        LOOPBACK TEST
      </label>
      <p className="mb-4 text-[12px] leading-relaxed text-lab-muted">
        Software-only encode → decode. Verifies protocol v2 without acoustic path.
      </p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 128))}
          maxLength={128}
          className="flex-1 rounded-lg border border-lab-border bg-lab-elevated px-4 py-3 font-mono text-white outline-none focus:border-lab-border-strong"
          placeholder="Test string"
        />
        <button
          type="button"
          onClick={runLoopback}
          disabled={running || !input.trim()}
          className="rounded-lg border border-lab-border-strong bg-lab-accent-dim px-4 py-3 text-[13px] font-medium text-lab-accent disabled:opacity-40"
        >
          {running ? '…' : 'Run'}
        </button>
      </div>
      {output ? (
        <div className="mt-4 rounded-lg border border-lab-accent/30 bg-lab-accent/10 p-3 font-mono text-sm text-white">
          {output}
        </div>
      ) : null}
    </div>
  );
}
