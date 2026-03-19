import { useState, useRef } from 'react';
import { Transmitter } from '../core/Transmitter';
import { Encoder } from '../protocol/Encoder';
import {
  encodeFileForChunks,
  chunkToMessage,
  isFileChunk,
  parseFileChunk,
  reassembleFile,
} from '../protocol/FileEncoder';

const transmitter = new Transmitter();

type Props = {
  onLog: (msg: string) => void;
};

export function FileTransferBeta({ onLog }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 5 * 1024) {
        onLog('⚠️ Max 5KB for beta');
        return;
      }
      setFile(f);
    }
  };

  const handleSendFile = async () => {
    if (!file) return;
    setSending(true);
    setSendProgress(0);
    try {
      const chunks = await encodeFileForChunks(file);
      onLog(`Sending ${file.name} (${chunks.length} chunks)`);
      for (let i = 0; i < chunks.length; i++) {
        const msg = chunkToMessage(chunks[i]);
        const payload = Encoder.encode(msg);
        await transmitter.transmit(payload);
        setSendProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      onLog(`✅ Sent ${file.name}`);
    } catch (err) {
      onLog(`Error: ${err}`);
    } finally {
      setSending(false);
      setSendProgress(0);
    }
  };

  return (
    <div className="mt-4 p-4 bg-amber-950/30 border border-amber-600/40 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-amber-500">β FILE TRANSFER</span>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
        >
          {file ? file.name : 'Choose file'}
        </button>
        <button
          onClick={handleSendFile}
          disabled={!file || sending}
          className="text-xs px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium"
        >
          {sending ? `${sendProgress}%` : 'Send file'}
        </button>
      </div>
      {sending && (
        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500/60 transition-all"
            style={{ width: `${sendProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function processReceivedForFile(
  msg: string,
  receivedChunks: Map<string, Map<number, string>>,
  onChunkReceived: (fileId: string, chunk: { index: number; total: number; data: string }) => void,
  onFileComplete: (fileId: string, blob: Blob) => void
): boolean {
  if (!isFileChunk(msg)) return false;
  const chunk = parseFileChunk(msg);
  if (!chunk) return true;
  const fileId = `f-${chunk.total}`;
  let map = receivedChunks.get(fileId);
  if (!map) {
    map = new Map();
    receivedChunks.set(fileId, map);
  }
  map.set(chunk.index, chunk.data);
  onChunkReceived(fileId, chunk);
  if (map.size === chunk.total) {
    const buf = reassembleFile(map);
    if (buf) {
      onFileComplete(fileId, new Blob([buf]));
      receivedChunks.delete(fileId);
    }
  }
  return true;
}
