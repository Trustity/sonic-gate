import { SonicConfig } from '../core/SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';
import { crc16ToBinary } from '../utils/Crc16';

const MAX_LENGTH = 128;
const ACK_BYTE = 0x06;

export class Encoder {
  /** Protocol v2: double sync, marker, version, length, payload, CRC16, tail. */
  static encode(text: string): string {
    const cleaned = text.slice(0, MAX_LENGTH).replace(/[^\x20-\x7E]/g, '?');
    const versionBinary = SonicConfig.PROTOCOL_VERSION.toString(2).padStart(8, '0');
    const lengthBinary = cleaned.length.toString(2).padStart(8, '0');
    const dataBinary = BinaryUtils.stringToBinary(cleaned);
    const checksumBinary = crc16ToBinary(cleaned);

    const sync = SonicConfig.SYNC_TOKEN.repeat(SonicConfig.SYNC_REPEAT);
    return (
      sync +
      SonicConfig.SYNC_MARKER_V2 +
      versionBinary +
      lengthBinary +
      dataBinary +
      checksumBinary +
      SonicConfig.TAIL
    );
  }

  /** Short ACK frame after a file chunk is received (2-byte payload). */
  static encodeAck(chunkIndex: number): string {
    const payload =
      String.fromCharCode(ACK_BYTE) + String.fromCharCode(chunkIndex & 0xff);
    return this.encode(payload);
  }

  static isAckPayload(text: string): boolean {
    return text.length === 2 && text.charCodeAt(0) === ACK_BYTE;
  }

  static parseAckIndex(text: string): number | null {
    if (!this.isAckPayload(text)) return null;
    return text.charCodeAt(1);
  }

  /** Software loopback — feed bits into a decoder without audio. */
  static bitsForLoopback(text: string): string {
    return this.encode(text);
  }
}
