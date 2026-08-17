import { useRef, useState } from 'react';
import { Transmitter } from '../core/Transmitter';
import { Receiver } from '../core/Receiver';
import { Encoder } from '../protocol/Encoder';
import { SonicConfig } from '../core/SonicConfig';
import {
  encodeFileForChunks,
  chunkToMessage,
  type FileReceiveState,
} from '../protocol/FileEncoder';
import { sleep, waitForAck } from '../utils/transmitUtils';

type Props = {
  transmitter: Transmitter;
  getReceiver: () => Receiver | null;
  isListening: boolean;
  onLog: (msg: string) => void;
  onRequestMic: () => Promise<boolean>;
  onStatus?: (status: { label: string; detail?: string; tone: 'active' | 'success' | 'warn' | 'error' | 'idle' }) => void;
};

export function FileTransferBeta({
  transmitter,
  getReceiver,
  isListening,
  onLog,
  onRequestMic,
  onStatus,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024) {
      onLog(`⚠️ Max 5 KB for beta (selected ${(f.size / 1024).toFixed(1)} KB)`);
      onStatus?.({
        label: 'File too large',
        detail: 'Beta limit is 5 KB',
        tone: 'warn',
      });
      e.target.value = '';
      return;
    }
    setFile(f);
    onLog(`📎 Selected ${f.name} (${f.size} bytes)`);
    onStatus?.({
      label: 'File ready',
      detail: `${f.name} · ${f.size} bytes`,
      tone: 'idle',
    });
  };

  const transmitMessage = async (msg: string) => {
    await transmitter.transmit(Encoder.encode(msg));
  };

  const handleSendFile = async () => {
    if (!file || sending) return;

    if (!isListening) {
      onLog('Enabling mic for ACK…');
      const ok = await onRequestMic();
      if (!ok) {
        onLog('⚠️ Mic required on sender to hear chunk ACKs');
        return;
      }
    }

    setSending(true);
    setSendProgress(0);
    onStatus?.({
      label: 'Sending file…',
      detail: file.name,
      tone: 'active',
    });

    try {
      const chunks = await encodeFileForChunks(file);
      onLog(`Sending ${file.name} (${chunks.length} frames, id ${chunks[0].fileId})`);
      const receiver = getReceiver();

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const msg = chunkToMessage(chunk);
        if (msg.length > 128) {
          onLog(`⚠️ Chunk ${i} too long (${msg.length} chars) — try a smaller file`);
          onStatus?.({ label: 'Chunk too long', detail: msg.slice(0, 40), tone: 'error' });
          return;
        }
        let acked = false;

        for (let attempt = 1; attempt <= SonicConfig.MAX_CHUNK_RETRIES; attempt++) {
          if (attempt > 1) onLog(`↻ Retry chunk ${i}/${chunks.length - 1} (attempt ${attempt})`);
          await transmitMessage(msg);
          await sleep(SonicConfig.CHUNK_PAUSE_MS);

          if (receiver && chunk.index > 0) {
            acked = await waitForAck(receiver, chunk.index);
            if (acked) break;
            onLog(`⚠️ No ACK for chunk ${chunk.index}`);
          } else {
            acked = true;
            await sleep(SonicConfig.CHUNK_PAUSE_MS);
            break;
          }
        }

        if (!acked) {
          onLog(`❌ Failed chunk ${i} after ${SonicConfig.MAX_CHUNK_RETRIES} tries`);
          return;
        }

        setSendProgress(Math.round(((i + 1) / chunks.length) * 100));
      }

      onLog(`✅ Sent ${file.name}`);
      onStatus?.({ label: 'File sent', detail: file.name, tone: 'success' });
    } catch (err) {
      onLog(`Error: ${err}`);
      onStatus?.({ label: 'File send failed', detail: String(err), tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-amber-600/40 bg-amber-950/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-bold text-amber-500">β FILE TRANSFER</span>
        <span className="text-[10px] text-amber-500/70">v2 · ACK · retry</span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-lab-muted">
        Meta frame + data chunks with acoustic ACK. Enable mic on both devices.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
        >
          {file ? file.name : 'Choose file'}
        </button>
        <button
          type="button"
          onClick={handleSendFile}
          disabled={!file || sending}
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {sending ? `${sendProgress}%` : 'Send file'}
        </button>
      </div>
      {sending && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full bg-amber-500/60 transition-all"
            style={{ width: `${sendProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export type { FileReceiveState };
