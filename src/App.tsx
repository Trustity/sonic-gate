// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Receiver } from './core/Receiver';
import { Encoder } from './protocol/Encoder';
import { FrequencyVisualizer } from './components/FrequencyVisualizer';
import { FileTransferBeta, processReceivedForFile } from './components/FileTransferBeta';
import { LabsChrome, LabsFooter } from './components/LabsChrome';
import { useMessageHistory } from './hooks/useMessageHistory';
import { Transmitter } from './core/Transmitter';

const transmitter = new Transmitter();

function App() {
  const [text, setText] = useState('HELLO');
  const [freq, setFreq] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [decodedMsg, setDecodedMsg] = useState('');
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [betaMode, setBetaMode] = useState(false);
  const receivedChunksRef = useRef(new Map<string, Map<number, string>>());
  const [receivedFile, setReceivedFile] = useState<{ name: string; blob: Blob } | null>(null);

  const { history, addReceived, clearHistory, exportHistory } = useMessageHistory();
  const receiverRef = useRef<Receiver | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 5));
  };

  useEffect(() => {
    receiverRef.current = new Receiver();

    receiverRef.current.onFrequencyDetected = (f) => setFreq(f);

    receiverRef.current.onMessageDecoded = (msg) => {
      setReceiveProgress(0);
      if (navigator.vibrate) navigator.vibrate(200);

      const isFile = processReceivedForFile(
        msg,
        receivedChunksRef.current,
        () => {},
        (_, blob) => {
          setReceivedFile({ name: `received-${Date.now()}.bin`, blob });
          addLog('📁 File received!');
        }
      );

      if (!isFile) {
        setDecodedMsg(msg);
        addReceived(msg);
      }
    };

    receiverRef.current.onProgress = setReceiveProgress;
    receiverRef.current.onLog = (msg) => addLog(msg);

    return () => {
      receiverRef.current?.stop();
    };
  }, [addReceived]);

  const toggleListen = async () => {
    if (isListening) {
      receiverRef.current?.stop();
      setIsListening(false);
    } else {
      addLog('Requesting mic...');
      const success = await receiverRef.current?.start();
      if (success) {
        setIsListening(true);
        setDecodedMsg('');
        setReceivedFile(null);
      } else {
        setIsListening(false);
      }
    }
  };

  const handleReset = () => {
    setDecodedMsg('');
    setReceiveProgress(0);
    setLogs([]);
    setReceivedFile(null);
    receiverRef.current?.reset();
    addLog('Ready for next message');
  };

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    try {
      const encodedPayload = Encoder.encode(text);
      await transmitter.transmit(encodedPayload);
    } finally {
      setIsSending(false);
    }
  };

  const downloadReceivedFile = () => {
    if (!receivedFile) return;
    const url = URL.createObjectURL(receivedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = receivedFile.name;
    a.click();
    URL.revokeObjectURL(url);
    setReceivedFile(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4 pb-10 sm:p-6">
      <LabsChrome />

      <div className="mb-4 flex w-full max-w-lg justify-end">
        <button
          type="button"
          onClick={() => setBetaMode((b) => !b)}
          className={`rounded border px-2.5 py-1 font-mono text-[11px] tracking-wide transition-colors ${
            betaMode
              ? 'border-amber-500/40 bg-amber-600/20 text-amber-400'
              : 'border-lab-border bg-lab-card text-lab-dim hover:text-lab-muted'
          }`}
        >
          β file transfer
        </button>
      </div>

      <div className="grid w-full max-w-lg gap-5">
        {/* TRANSMITTER */}
        <div className="rounded-xl border border-lab-border bg-lab-card p-5 sm:p-6">
          <label className="mb-3 block text-[10px] font-bold tracking-[0.2em] text-lab-dim">
            TRANSMITTER
          </label>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 128))}
              placeholder="Type a message (max 128 chars)"
              maxLength={128}
              className="flex-1 rounded-lg border border-lab-border bg-lab-elevated px-4 py-3 font-mono text-white placeholder-lab-dim outline-none focus:border-lab-border-strong"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !text.trim()}
              className="rounded-lg bg-lab-accent px-5 py-3 font-bold text-lab-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSending ? '…' : 'SEND'}
            </button>
          </div>
          {betaMode && <FileTransferBeta onLog={addLog} />}
        </div>

        {/* RECEIVER */}
        <div className="relative overflow-hidden rounded-xl border border-lab-border bg-lab-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-[0.2em] text-lab-dim">
              RECEIVER
            </label>
            <button
              type="button"
              onClick={toggleListen}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                isListening
                  ? 'bg-red-500/20 text-red-400'
                  : 'border border-lab-border bg-lab-elevated text-lab-muted hover:text-white'
              }`}
            >
              {isListening ? 'STOP MIC' : 'ENABLE MIC'}
            </button>
          </div>

          <FrequencyVisualizer currentFreq={freq} />

          {receiveProgress > 0 && receiveProgress < 100 && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-lab-elevated">
              <div
                className="h-full bg-lab-accent/70 transition-all duration-150"
                style={{ width: `${receiveProgress}%` }}
              />
            </div>
          )}

          <div className="mt-4 h-24 overflow-y-auto rounded border border-lab-border bg-black/40 p-3 font-mono text-[10px] text-lab-muted">
            {logs.length === 0 && (
              <div className="italic text-lab-dim">Logs will appear here...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="mb-1 border-b border-lab-border/50 pb-1 last:mb-0 last:border-0">
                {log}
              </div>
            ))}
          </div>

          {(decodedMsg || receivedFile) && (
            <div className="mt-4 rounded-xl border border-lab-accent/30 bg-lab-accent/10 p-4 text-center">
              <span className="mb-1 block text-[10px] text-lab-accent">DECODED</span>
              {decodedMsg && (
                <span className="mb-3 block font-mono text-2xl font-bold text-white">
                  {decodedMsg}
                </span>
              )}
              {receivedFile && (
                <div className="mb-3">
                  <span className="block text-sm text-lab-muted">File received</span>
                  <button
                    type="button"
                    onClick={downloadReceivedFile}
                    className="mt-1 rounded bg-amber-600/40 px-3 py-1 text-xs text-amber-400 hover:bg-amber-600/60"
                  >
                    Download
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-lab-border bg-lab-elevated px-4 py-2 text-xs font-medium text-lab-muted hover:text-white"
              >
                Reset — Ready for next
              </button>
            </div>
          )}
        </div>

        {/* HISTORY */}
        <div className="rounded-xl border border-lab-border bg-lab-card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-[0.2em] text-lab-dim">
              HISTORY
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportHistory}
                disabled={history.length === 0}
                className="rounded border border-lab-border bg-lab-elevated px-2 py-1 text-xs text-lab-muted disabled:opacity-40 hover:text-white"
              >
                Export
              </button>
              <button
                type="button"
                onClick={clearHistory}
                disabled={history.length === 0}
                className="rounded border border-lab-border bg-lab-elevated px-2 py-1 text-xs text-lab-muted disabled:opacity-40 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto font-mono text-sm text-lab-muted">
            {history.length === 0 && (
              <div className="italic text-lab-dim">No messages yet</div>
            )}
            {history.slice(0, 20).map((e) => (
              <div key={e.id} className="truncate">
                {e.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      <LabsFooter />
    </div>
  );
}

export default App;
