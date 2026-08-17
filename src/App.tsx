// src/App.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Receiver } from './core/Receiver';
import { Encoder } from './protocol/Encoder';
import { FrequencyVisualizer } from './components/FrequencyVisualizer';
import {
  FileTransferBeta,
  type FileReceiveState,
} from './components/FileTransferBeta';
import { LabsChrome, LabsFooter } from './components/LabsChrome';
import { useMessageHistory } from './hooks/useMessageHistory';
import { Transmitter } from './core/Transmitter';
import { MicLevelMeter } from './components/MicLevelMeter';
import { TxIndicator } from './components/TxIndicator';
import { TipsPanel } from './components/TipsPanel';
import { LoopbackPanel } from './components/LoopbackPanel';
import { LiveStatusBar, type LiveStatus } from './components/LiveStatusBar';
import {
  SonicConfig,
  SPEED_PRESETS,
  type SpeedPreset,
} from './core/SonicConfig';
import type { ReceiverActivity } from './core/Receiver';
import {
  processReceivedForFile,
  parseFileProtocolMessage,
  isFileProtocolMessage,
} from './protocol/FileEncoder';

const transmitter = new Transmitter();

type Tab = 'transfer' | 'loopback';

function App() {
  const [tab, setTab] = useState<Tab>('transfer');
  const [text, setText] = useState('HELLO');
  const [freq, setFreq] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [decodedMsg, setDecodedMsg] = useState('');
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [fileReceiveProgress, setFileReceiveProgress] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [txActive, setTxActive] = useState(false);
  const [betaMode, setBetaMode] = useState(false);
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>('slow');
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({
    label: 'Ready',
    detail: 'Enable mic on the receiver, then SEND from the other device',
    tone: 'idle',
  });

  const fileSessionsRef = useRef<FileReceiveState>(new Map());
  const [receivedFile, setReceivedFile] = useState<{ name: string; blob: Blob } | null>(null);

  const { history, addReceived, clearHistory, exportHistory } = useMessageHistory();
  const receiverRef = useRef<Receiver | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  useEffect(() => {
    SonicConfig.setPreset(speedPreset);
  }, [speedPreset]);

  useEffect(() => {
    transmitter.onPhaseChange = (phase) => {
      setTxActive(phase === 'transmitting');
      if (phase === 'transmitting' && tab === 'transfer') {
        setLiveStatus({
          label: 'Transmitting…',
          detail: `${SPEED_PRESETS[speedPreset].label} · speaker output active`,
          tone: 'active',
        });
      }
    };
  }, [tab, speedPreset]);

  const applyRxActivity = useCallback((activity: ReceiverActivity) => {
    switch (activity) {
      case 'listening':
        setLiveStatus({
          label: 'Listening',
          detail: 'Waiting for acoustic signal…',
          tone: 'idle',
        });
        break;
      case 'signal_detected':
        setLiveStatus({
          label: 'Signal detected',
          detail: 'Locking sync and reading frame…',
          tone: 'active',
        });
        break;
      case 'decoding':
        setLiveStatus({
          label: 'Decoding',
          detail: 'Reading payload bits…',
          tone: 'active',
        });
        break;
      case 'finalizing':
        setLiveStatus({
          label: 'Finishing decode',
          detail: 'Transmission ended — aligning bits and decoding',
          tone: 'active',
        });
        break;
      case 'signal_lost':
        setLiveStatus({
          label: 'No signal',
          detail: 'Ready for the next transmission',
          tone: 'warn',
        });
        break;
      case 'decode_timeout':
        setLiveStatus({
          label: 'Could not decode',
          detail: 'Same Slow speed on both devices; hold them closer',
          tone: 'error',
        });
        break;
      case 'idle':
        break;
    }
  }, []);

  useEffect(() => {
    receiverRef.current = new Receiver();

    receiverRef.current.onFrequencyDetected = (f) => setFreq(f);
    receiverRef.current.onMicLevel = setMicLevel;

    receiverRef.current.onMessageDecoded = (msg) => {
      setReceiveProgress(0);
      if (navigator.vibrate) navigator.vibrate(200);

      const isFile = processReceivedForFile(
        msg,
        fileSessionsRef.current,
        (_id, received, total) => {
          setFileReceiveProgress(total > 0 ? Math.round((received / total) * 100) : 0);
        },
        (_id, name, blob) => {
          setReceivedFile({ name, blob });
          setFileReceiveProgress(100);
          addLog(`📁 File received: ${name}`);
          setLiveStatus({
            label: 'File received',
            detail: name,
            tone: 'success',
          });
        },
      );

      if (isFile) {
        const chunk = parseFileProtocolMessage(msg);
        if (chunk && chunk.index > 0) {
          void transmitter.transmit(Encoder.encodeAck(chunk.index));
        }
        return;
      }

      setDecodedMsg(msg);
      addReceived(msg);
      setLiveStatus({
        label: 'Message received',
        detail: msg.length > 64 ? `${msg.slice(0, 64)}…` : msg,
        tone: 'success',
      });
    };

    receiverRef.current.onProgress = (p) => {
      setReceiveProgress(p);
      if (p > 0 && p < 100) {
        setLiveStatus({
          label: 'Decoding',
          detail: `${p}% of payload received`,
          tone: 'active',
        });
      }
    };
    receiverRef.current.onActivityChange = applyRxActivity;
    receiverRef.current.onLog = (msg) => addLog(msg);

    return () => {
      receiverRef.current?.stop();
    };
  }, [addLog, addReceived, applyRxActivity]);

  const ensureMic = async (): Promise<boolean> => {
    if (isListening) return true;
    addLog('Requesting mic…');
    const success = await receiverRef.current?.start();
    if (success) {
      setIsListening(true);
      return true;
    }
    return false;
  };

  const toggleListen = async () => {
    if (isListening) {
      receiverRef.current?.stop();
      setIsListening(false);
      setMicLevel(0);
      setLiveStatus({
        label: 'Mic off',
        detail: 'Tap ENABLE MIC on the receiver',
        tone: 'idle',
      });
    } else {
      const success = await ensureMic();
      if (success) {
        setDecodedMsg('');
        setReceivedFile(null);
        setFileReceiveProgress(null);
        setLiveStatus({
          label: 'Listening',
          detail: `Same speed on both devices: ${SPEED_PRESETS[speedPreset].label}`,
          tone: 'idle',
        });
      } else {
        setIsListening(false);
      }
    }
  };

  const handleReset = () => {
    setDecodedMsg('');
    setReceiveProgress(0);
    setFileReceiveProgress(null);
    setLogs([]);
    setReceivedFile(null);
    fileSessionsRef.current.clear();
    receiverRef.current?.reset();
    addLog('Ready for next message');
  };

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    SonicConfig.setPreset(speedPreset);
    try {
      await transmitter.transmit(Encoder.encode(text));
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
    setFileReceiveProgress(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4 pb-10 sm:p-6">
      <TxIndicator active={txActive} />
      <LabsChrome />

      <div className="mb-4 flex w-full max-w-lg flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-lab-border bg-lab-card p-0.5">
          {(['transfer', 'loopback'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                tab === t
                  ? 'bg-lab-accent-dim text-lab-accent'
                  : 'text-lab-dim hover:text-lab-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] text-lab-dim">SPEED</label>
          <select
            value={speedPreset}
            onChange={(e) => setSpeedPreset(e.target.value as SpeedPreset)}
            className="rounded border border-lab-border bg-lab-elevated px-2 py-1 font-mono text-[11px] text-lab-muted outline-none"
          >
            {(Object.keys(SPEED_PRESETS) as SpeedPreset[]).map((key) => (
              <option key={key} value={key}>
                {SPEED_PRESETS[key].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-3 w-full max-w-lg text-[10px] text-lab-dim">
        {SPEED_PRESETS[speedPreset].hint} · protocol v{SonicConfig.PROTOCOL_VERSION}
      </p>

      <div className="sticky top-2 z-40 mb-4 w-full max-w-lg">
        <LiveStatusBar {...liveStatus} />
      </div>

      {tab === 'loopback' ? (
        <div className="grid w-full max-w-lg gap-5">
          <LoopbackPanel
            speedPreset={speedPreset}
            onLog={addLog}
            onStatus={setLiveStatus}
          />
          <TipsPanel />
        </div>
      ) : (
        <div className="grid w-full max-w-lg gap-5">
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
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setBetaMode((b) => !b)}
                className={`rounded border px-2.5 py-1 font-mono text-[11px] tracking-wide transition-colors ${
                  betaMode
                    ? 'border-amber-500/40 bg-amber-600/20 text-amber-400'
                    : 'border-lab-border bg-lab-elevated text-lab-dim hover:text-lab-muted'
                }`}
              >
                β file transfer
              </button>
            </div>
            {betaMode && (
              <FileTransferBeta
                transmitter={transmitter}
                getReceiver={() => receiverRef.current}
                isListening={isListening}
                onLog={addLog}
                onRequestMic={ensureMic}
                onStatus={setLiveStatus}
              />
            )}
          </div>

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
            {isListening && <MicLevelMeter level={micLevel} />}

            {(receiveProgress > 0 && receiveProgress < 100) || fileReceiveProgress !== null ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-lab-elevated">
                <div
                  className="h-full bg-lab-accent/70 transition-all duration-150"
                  style={{
                    width: `${fileReceiveProgress ?? receiveProgress}%`,
                  }}
                />
              </div>
            ) : null}

            <div className="mt-4 h-28 overflow-y-auto rounded border border-lab-border bg-black/40 p-3 font-mono text-[10px] text-lab-muted">
              {logs.length === 0 && (
                <div className="italic text-lab-dim">Logs will appear here…</div>
              )}
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="mb-1 border-b border-lab-border/50 pb-1 last:mb-0 last:border-0"
                >
                  {log}
                </div>
              ))}
            </div>

            {(decodedMsg || receivedFile) && (
              <div className="mt-4 rounded-xl border border-lab-accent/30 bg-lab-accent/10 p-4 text-center">
                <span className="mb-1 block text-[10px] text-lab-accent">DECODED</span>
                {decodedMsg && !isFileProtocolMessage(decodedMsg) && (
                  <span className="mb-3 block font-mono text-2xl font-bold text-white">
                    {decodedMsg}
                  </span>
                )}
                {receivedFile && (
                  <div className="mb-3">
                    <span className="block text-sm text-lab-muted">{receivedFile.name}</span>
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
                  Reset — ready for next
                </button>
              </div>
            )}
          </div>

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

          <TipsPanel />
        </div>
      )}

      <LabsFooter />
    </div>
  );
}

export default App;
