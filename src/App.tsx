// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Receiver } from './core/Receiver';
import { Encoder } from './protocol/Encoder';
import { FrequencyVisualizer } from './components/FrequencyVisualizer';
import { FileTransferBeta, processReceivedForFile } from './components/FileTransferBeta';
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-4 font-sans">
      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          SONIC<span className="text-white">GATE</span>
        </h1>
        <button
          onClick={() => setBetaMode((b) => !b)}
          className={`text-xs px-2 py-1 rounded font-mono ${
            betaMode ? 'bg-amber-600/30 text-amber-400' : 'bg-gray-800 text-gray-500'
          }`}
        >
          β
        </button>
      </div>

      <div className="grid gap-8 w-full max-w-lg">
        {/* TRANSMITTER */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
          <label className="text-xs font-bold text-gray-500 mb-2 block tracking-widest">
            TRANSMITTER
          </label>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 128))}
              placeholder="Type a message (max 128 chars)"
              maxLength={128}
              className="bg-gray-800 text-white px-4 py-3 rounded-lg flex-1 font-mono placeholder-gray-500"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !text.trim()}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold"
            >
              {isSending ? '…' : 'SEND'}
            </button>
          </div>
          {betaMode && <FileTransferBeta onLog={addLog} />}
        </div>

        {/* RECEIVER */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <label className="text-xs font-bold text-gray-500 tracking-widest">RECEIVER</label>
            <button
              onClick={toggleListen}
              className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${
                isListening ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {isListening ? 'STOP MIC' : 'ENABLE MIC'}
            </button>
          </div>

          <FrequencyVisualizer currentFreq={freq} />

          {receiveProgress > 0 && receiveProgress < 100 && (
            <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500/60 transition-all duration-150"
                style={{ width: `${receiveProgress}%` }}
              />
            </div>
          )}

          <div className="mt-4 bg-black/40 p-3 rounded text-[10px] font-mono text-gray-400 h-24 overflow-y-auto border border-gray-800">
            {logs.length === 0 && <div className="text-gray-600 italic">Logs will appear here...</div>}
            {logs.map((log, i) => (
              <div key={i} className="border-b border-gray-800/50 pb-1 mb-1 last:border-0">
                {log}
              </div>
            ))}
          </div>

          {(decodedMsg || receivedFile) && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-center">
              <span className="text-[10px] text-green-400 block mb-1">DECODED</span>
              {decodedMsg && (
                <span className="text-2xl font-mono font-bold text-white block mb-3">
                  {decodedMsg}
                </span>
              )}
              {receivedFile && (
                <div className="mb-3">
                  <span className="text-sm text-gray-400 block">File received</span>
                  <button
                    onClick={downloadReceivedFile}
                    className="text-xs px-3 py-1 mt-1 rounded bg-amber-600/40 text-amber-400 hover:bg-amber-600/60"
                  >
                    Download
                  </button>
                </div>
              )}
              <button
                onClick={handleReset}
                className="text-xs px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium"
              >
                Reset — Ready for next
              </button>
            </div>
          )}
        </div>

        {/* HISTORY */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-bold text-gray-500 tracking-widest">HISTORY</label>
            <div className="flex gap-2">
              <button
                onClick={exportHistory}
                disabled={history.length === 0}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-400"
              >
                Export
              </button>
              <button
                onClick={clearHistory}
                disabled={history.length === 0}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto text-sm font-mono text-gray-400 space-y-1">
            {history.length === 0 && <div className="text-gray-600 italic">No messages yet</div>}
            {history.slice(0, 20).map((e) => (
              <div key={e.id} className="truncate">
                {e.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
