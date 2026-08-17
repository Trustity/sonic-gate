import { Receiver } from '../core/Receiver';
import { SonicConfig } from '../core/SonicConfig';

/** Wait until the mic hears an acoustic ACK for a given chunk index. */
export function waitForAck(
  receiver: Receiver,
  chunkIndex: number,
  timeoutMs = SonicConfig.ACK_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    const previous = receiver.onAckReceived;
    const timer = window.setTimeout(() => {
      receiver.onAckReceived = previous;
      resolve(false);
    }, timeoutMs);

    receiver.onAckReceived = (idx) => {
      previous(idx);
      if (idx === chunkIndex) {
        window.clearTimeout(timer);
        receiver.onAckReceived = previous;
        resolve(true);
      }
    };
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
