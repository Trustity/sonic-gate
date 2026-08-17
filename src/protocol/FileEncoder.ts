/** File chunks over the text sonic channel (protocol v2 payloads). */

const META_PREFIX = 'M:';
const CHUNK_PREFIX = 'F:';
const MAX_DATA_PER_CHUNK = 100;
const MAX_NAME_LEN = 32;

export type FileChunk = {
  kind: 'meta' | 'data';
  fileId: string;
  index: number;
  total: number;
  name?: string;
  data: string;
};

export type FileSession = {
  fileId: string;
  name: string;
  total: number;
  chunks: Map<number, string>;
};

function randomFileId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function encodeFileForChunks(file: File): Promise<FileChunk[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const fileId = randomFileId();
      const name = file.name.slice(0, MAX_NAME_LEN);
      const dataParts: string[] = [];
      for (let i = 0; i < base64.length; i += MAX_DATA_PER_CHUNK) {
        dataParts.push(base64.slice(i, i + MAX_DATA_PER_CHUNK));
      }
      const total = dataParts.length + 1;
      const chunks: FileChunk[] = [
        {
          kind: 'meta',
          fileId,
          index: 0,
          total,
          name,
          data: '',
        },
      ];
      dataParts.forEach((data, i) => {
        chunks.push({
          kind: 'data',
          fileId,
          index: i + 1,
          total,
          data,
        });
      });
      resolve(chunks);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function chunkToMessage(chunk: FileChunk): string {
  if (chunk.kind === 'meta') {
    const tot = chunk.total.toString().padStart(3, '0');
    return `${META_PREFIX}${chunk.fileId}:${tot}:${chunk.name ?? 'file.bin'}`;
  }
  const idx = chunk.index.toString().padStart(3, '0');
  const tot = chunk.total.toString().padStart(3, '0');
  return `${CHUNK_PREFIX}${chunk.fileId}:${idx}:${tot}:${chunk.data}`;
}

export function isFileProtocolMessage(msg: string): boolean {
  return msg.startsWith(META_PREFIX) || msg.startsWith(CHUNK_PREFIX);
}

export function parseFileProtocolMessage(msg: string): FileChunk | null {
  if (msg.startsWith(META_PREFIX)) {
    const rest = msg.slice(META_PREFIX.length);
    const [fileId, totStr, ...nameParts] = rest.split(':');
    const name = nameParts.join(':');
    if (!fileId || !totStr || !name) return null;
    const total = parseInt(totStr, 10);
    if (isNaN(total) || total < 2) return null;
    return { kind: 'meta', fileId, index: 0, total, name, data: '' };
  }
  if (msg.startsWith(CHUNK_PREFIX)) {
    const rest = msg.slice(CHUNK_PREFIX.length);
    const [fileId, idxStr, totStr, ...dataParts] = rest.split(':');
    const data = dataParts.join(':');
    if (!fileId || !idxStr || !totStr || data === undefined) return null;
    const index = parseInt(idxStr, 10);
    const total = parseInt(totStr, 10);
    if (isNaN(index) || isNaN(total) || index < 1 || total < 2 || index >= total) {
      return null;
    }
    return { kind: 'data', fileId, index, total, data };
  }
  return null;
}

export function reassembleFile(session: FileSession): ArrayBuffer | null {
  if (session.chunks.size !== session.total - 1) return null;
  let base64 = '';
  for (let i = 1; i < session.total; i++) {
    const part = session.chunks.get(i);
    if (!part) return null;
    base64 += part;
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

export type FileReceiveState = Map<string, FileSession>;

export function processReceivedForFile(
  msg: string,
  sessions: FileReceiveState,
  onProgress: (fileId: string, received: number, total: number) => void,
  onFileComplete: (fileId: string, name: string, blob: Blob) => void,
): boolean {
  if (!isFileProtocolMessage(msg)) return false;
  const chunk = parseFileProtocolMessage(msg);
  if (!chunk) return true;

  if (chunk.kind === 'meta') {
    sessions.set(chunk.fileId, {
      fileId: chunk.fileId,
      name: chunk.name ?? 'received.bin',
      total: chunk.total,
      chunks: new Map(),
    });
    onProgress(chunk.fileId, 0, chunk.total - 1);
    return true;
  }

  let session = sessions.get(chunk.fileId);
  if (!session) {
    session = {
      fileId: chunk.fileId,
      name: `received-${chunk.fileId}.bin`,
      total: chunk.total,
      chunks: new Map(),
    };
    sessions.set(chunk.fileId, session);
  }

  session.chunks.set(chunk.index, chunk.data);
  onProgress(chunk.fileId, session.chunks.size, session.total - 1);

  if (session.chunks.size === session.total - 1) {
    const buf = reassembleFile(session);
    if (buf) {
      onFileComplete(session.fileId, session.name, new Blob([buf]));
      sessions.delete(chunk.fileId);
    }
  }
  return true;
}
