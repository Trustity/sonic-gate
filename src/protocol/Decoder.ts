import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';
import { crc16 } from '../utils/Crc16';
import { Encoder } from './Encoder';

type DecoderState =
  | 'IDLE'
  | 'V2_CHECK_MARKER'
  | 'V2_READ_VERSION'
  | 'V1_READ_LENGTH'
  | 'READ_LENGTH'
  | 'READ_DATA'
  | 'CHECK';

export class Decoder {
  private state: DecoderState = 'IDLE';
  private buffer = '';
  private messageLength = 0;
  private pendingDataBinary = '';
  private protocolVersion: 1 | 2 = 1;

  public onMessageDecoded: (msg: string) => void = () => {};
  public onAckReceived: (chunkIndex: number) => void = () => {};
  public onProgress: (percent: number) => void = () => {};
  public onLog: (msg: string) => void = () => {};

  public processBit(bit: '0' | '1') {
    this.buffer += bit;

    switch (this.state) {
      case 'IDLE':
        this.tryFindSync();
        break;
      case 'V2_CHECK_MARKER':
        this.checkV2Marker();
        break;
      case 'V2_READ_VERSION':
        this.readVersion();
        break;
      case 'V1_READ_LENGTH':
      case 'READ_LENGTH':
        this.readLength();
        break;
      case 'READ_DATA':
        this.readData();
        break;
      case 'CHECK':
        this.verifyChecksum();
        break;
    }
  }

  private tryFindSync() {
    if (this.buffer.length > 48) this.buffer = this.buffer.slice(-40);
    const sync = SonicConfig.SYNC_TOKEN;
    if (this.buffer.length < sync.length) return;

    const tail = this.buffer.slice(-sync.length);
    const errors = tail.split('').filter((c, i) => c !== sync[i]).length;
    if (errors <= 2) {
      this.onLog(`🔹 SYNC OK (${errors} err)`);
      this.buffer = '';
      this.state = 'V2_CHECK_MARKER';
    }
  }

  private checkV2Marker() {
    if (this.buffer.length < 16) return;

    // v2 transmit repeats the 16-bit sync — consume the second preamble.
    const maybeSync = this.buffer.slice(0, 16);
    const syncErrors = maybeSync
      .split('')
      .filter((c, i) => c !== SonicConfig.SYNC_TOKEN[i]).length;
    if (syncErrors <= 2) {
      this.onLog('🔹 Sync preamble 2/2');
      this.buffer = this.buffer.slice(16);
      if (this.buffer.length < 16) return;
    }

    const marker = this.buffer.slice(0, 16);
    const markerErrors = marker
      .split('')
      .filter((c, i) => c !== SonicConfig.SYNC_MARKER_V2[i]).length;

    if (markerErrors <= 2) {
      this.onLog('🔹 Protocol v2');
      this.protocolVersion = 2;
      this.buffer = this.buffer.slice(16);
      this.state = 'V2_READ_VERSION';
      return;
    }

    // Fall back to v1: first 8 bits after sync are length.
    this.protocolVersion = 1;
    this.onLog('🔹 Protocol v1');
    this.state = 'V1_READ_LENGTH';
  }

  private readVersion() {
    if (this.buffer.length < 8) return;
    const version = parseInt(this.buffer.slice(0, 8), 2);
    this.buffer = this.buffer.slice(8);
      if (version !== SonicConfig.PROTOCOL_VERSION) {
      this.onLog(`⚠️ Unknown version ${version} (misaligned frame)`);
      this.reset();
      return;
    }
    this.state = 'READ_LENGTH';
  }

  private readLength() {
    if (this.buffer.length < 8) return;
    this.messageLength = parseInt(this.buffer.slice(0, 8), 2);
    this.buffer = this.buffer.slice(8);
    this.onLog(`🔹 Expecting ${this.messageLength} chars`);

    if (this.messageLength === 0 || this.messageLength > 128) {
      this.onLog(`⚠️ Invalid length (${this.messageLength}), resetting.`);
      this.reset();
      return;
    }
    this.state = 'READ_DATA';
  }

  private readData() {
    const targetBits = this.messageLength * 8;
    this.onProgress(Math.min(100, Math.round((this.buffer.length / targetBits) * 100)));

    if (this.buffer.length < targetBits) return;

    this.onLog('🔹 Payload received. Checking…');
    this.pendingDataBinary = this.buffer.slice(0, targetBits);
    this.buffer = this.buffer.slice(targetBits);
    this.state = 'CHECK';
  }

  private verifyChecksum() {
    const checksumBits = this.protocolVersion === 2 ? 16 : 8;
    if (this.buffer.length < checksumBits) return;

    const checksumReceived = parseInt(this.buffer.slice(0, checksumBits), 2);
    this.buffer = this.buffer.slice(checksumBits);

    try {
      const msg = BinaryUtils.binaryToString(this.pendingDataBinary);

      if (this.protocolVersion === 2) {
        const expected = crc16(msg);
        if (checksumReceived !== expected) {
          this.onLog('⚠️ CRC16 mismatch. Ignoring.');
          this.reset();
          return;
        }
      } else {
        let expected = 0;
        for (let i = 0; i < msg.length; i++) expected ^= msg.charCodeAt(i);
        if (checksumReceived !== expected) {
          this.onLog('⚠️ Checksum mismatch. Ignoring.');
          this.reset();
          return;
        }
      }

      if (Encoder.isAckPayload(msg)) {
        const idx = Encoder.parseAckIndex(msg);
        if (idx !== null) {
          this.onLog(`✅ ACK for chunk ${idx}`);
          this.onAckReceived(idx);
        }
      } else {
        this.onLog(`💡 Verified: "${msg.slice(0, 32)}${msg.length > 32 ? '…' : ''}"`);
        this.onMessageDecoded(msg);
      }
    } catch {
      this.onLog('❌ Decode error');
    }
    this.reset();
  }

  public reset() {
    this.state = 'IDLE';
    this.buffer = '';
    this.messageLength = 0;
    this.pendingDataBinary = '';
    this.protocolVersion = 1;
    this.onProgress(0);
  }

  /** True while a frame is partially received (not idle). */
  public isBusy(): boolean {
    return this.state !== 'IDLE';
  }

  /** Human-readable decode phase for UI status. */
  public getPhaseLabel(): string | null {
    switch (this.state) {
      case 'IDLE':
        return null;
      case 'V2_CHECK_MARKER':
        return 'syncing';
      case 'V2_READ_VERSION':
      case 'V1_READ_LENGTH':
      case 'READ_LENGTH':
        return 'reading header';
      case 'READ_DATA':
        return 'reading payload';
      case 'CHECK':
        return 'verifying';
      default:
        return 'decoding';
    }
  }
}
