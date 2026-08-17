/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over a JS string payload. */
export function crc16(payload: string): number {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc & 0xffff;
}

export function crc16ToBinary(payload: string): string {
  return crc16(payload).toString(2).padStart(16, '0');
}
