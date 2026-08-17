import { SonicConfig } from '../core/SonicConfig';
import { Decoder } from '../protocol/Decoder';

function hamming(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let err = 0;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) err++;
  return err;
}

type DecodeHit = { kind: 'message'; text: string } | { kind: 'ack'; index: number };

function tryDecodeSlice(bits: string, onLog: (m: string) => void): DecodeHit | null {
  const decoder = new Decoder();
  let hit: DecodeHit | null = null;
  decoder.onLog = onLog;
  decoder.onMessageDecoded = (msg) => {
    hit = { kind: 'message', text: msg };
  };
  decoder.onAckReceived = (idx) => {
    hit = { kind: 'ack', index: idx };
  };
  for (const b of bits) {
    if (b === '0' || b === '1') decoder.processBit(b);
    if (hit) break;
  }
  return hit;
}

/**
 * Find sync in a noisy bit stream and decode with ± bit slip (mobile clock drift).
 */
export function decodeAlignedBitStream(
  raw: string,
  onLog: (m: string) => void,
): DecodeHit | null {
  if (raw.length < 48) return null;

  const sync = SonicConfig.SYNC_TOKEN;
  let bestStart = 0;
  let bestErr = Infinity;

  for (let i = 0; i <= raw.length - sync.length; i++) {
    const err = hamming(raw.slice(i, i + sync.length), sync);
    if (err < bestErr) {
      bestErr = err;
      bestStart = i;
    }
  }

  if (bestErr > 4) {
    onLog(`⚠️ No sync in ${raw.length} bits (best ${bestErr} err)`);
    return null;
  }

  onLog(`🔧 Aligning at bit ${bestStart} (${bestErr} sync err)`);

  for (let slip = 0; slip < 16; slip++) {
    const start = Math.max(0, bestStart - 6 + slip);
    const hit = tryDecodeSlice(raw.slice(start), () => {});
    if (hit) {
      onLog(`🔧 Locked with slip ${slip - 6}`);
      return hit;
    }
  }

  return null;
}
