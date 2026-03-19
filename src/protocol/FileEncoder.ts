/** Beta: chunks a file for sonic transfer. Format: F:index:total:base64 */
const CHUNK_PREFIX = 'F:';
const MAX_DATA_PER_CHUNK = 115;

export type FileChunk = {
  index: number;
  total: number;
  data: string;
};

export function encodeFileForChunks(file: File): Promise<FileChunk[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(buf))
      );
      const chunks: FileChunk[] = [];
      for (let i = 0; i < base64.length; i += MAX_DATA_PER_CHUNK) {
        chunks.push({
          index: chunks.length,
          total: 0,
          data: base64.slice(i, i + MAX_DATA_PER_CHUNK),
        });
      }
      chunks.forEach((c) => (c.total = chunks.length));
      resolve(chunks);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function chunkToMessage(chunk: FileChunk): string {
  const idx = chunk.index.toString().padStart(3, '0');
  const tot = chunk.total.toString().padStart(3, '0');
  return `${CHUNK_PREFIX}${idx}:${tot}:${chunk.data}`;
}

export function isFileChunk(msg: string): boolean {
  return msg.startsWith(CHUNK_PREFIX);
}

export function parseFileChunk(msg: string): FileChunk | null {
  if (!isFileChunk(msg)) return null;
  const rest = msg.slice(CHUNK_PREFIX.length);
  const [idxStr, totStr, data] = rest.split(':');
  if (!idxStr || !totStr || data === undefined) return null;
  const index = parseInt(idxStr, 10);
  const total = parseInt(totStr, 10);
  if (isNaN(index) || isNaN(total) || index < 0 || total < 1 || index >= total)
    return null;
  return { index, total, data };
}

export function reassembleFile(chunks: Map<number, string>): ArrayBuffer | null {
  const total = chunks.size;
  if (total === 0) return null;
  let base64 = '';
  for (let i = 0; i < total; i++) {
    const d = chunks.get(i);
    if (!d) return null;
    base64 += d;
  }
  try {
    const binary = atob(base64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return arr.buffer;
  } catch {
    return null;
  }
}
