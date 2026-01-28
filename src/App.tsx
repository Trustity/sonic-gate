// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Transmitter } from './core/Transmitter';
import { Receiver } from './core/Receiver';
import { Encoder } from './protocol/Encoder';
import { FrequencyVisualizer } from './components/FrequencyVisualizer';

const transmitter = new Transmitter();

function App() {
  const [text, setText] = useState('HELLO');
  const [freq, setFreq] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [decodedMsg, setDecodedMsg] = useState('');
  
  // --- סטייט ללוגים ---
  const [logs, setLogs] = useState<string[]>([]);
  
  const receiverRef = useRef<Receiver | null>(null);

  // פונקציית עזר להוספת לוג (שומרת רק את ה-5 האחרונים)
  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  useEffect(() => {
    receiverRef.current = new Receiver();
    
    receiverRef.current.onFrequencyDetected = (f) => setFreq(f);
    
    receiverRef.current.onMessageDecoded = (msg) => {
      setDecodedMsg(msg);
      if (navigator.vibrate) navigator.vibrate(200);
    };

    // --- חיבור הלוג למסך ---
    receiverRef.current.onLog = (msg) => {
      addLog(msg);
    };

    return () => {
      receiverRef.current?.stop();
    };
  }, []);

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
      } else {
        setIsListening(false);
      }
    }
  };

  const handleSend = async () => {
    if (!text) return;
    const encodedPayload = Encoder.encode(text);
    console.log(`Sending: ${encodedPayload}`);
    await transmitter.transmit(encodedPayload);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 font-sans">
      <h1 className="text-5xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
        SONIC<span className="text-white">GATE</span>
      </h1>

      <div className="grid gap-8 w-full max-w-lg">
        {/* TRANSMITTER */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
          <label className="text-xs font-bold text-gray-500 mb-2 block tracking-widest">TRANSMITTER</label>
          <div className="flex gap-2">
            <input 
              value={text} 
              onChange={e => setText(e.target.value)}
              className="bg-gray-800 text-white px-4 py-3 rounded-lg flex-1 font-mono"
            />
            <button 
              onClick={handleSend}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold"
            >
              SEND
            </button>
          </div>
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

          {/* --- תיבת לוגים (DEBUG LOG) --- */}
          <div className="mt-4 bg-black/40 p-3 rounded text-[10px] font-mono text-gray-400 h-24 overflow-y-auto border border-gray-800">
            {logs.length === 0 && <div className="text-gray-600 italic">Logs will appear here...</div>}
            {logs.map((log, i) => (
              <div key={i} className="border-b border-gray-800/50 pb-1 mb-1 last:border-0">
                {log}
              </div>
            ))}
          </div>

          {decodedMsg && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-center animate-pulse">
              <span className="text-[10px] text-green-400 block mb-1">DECODED</span>
              <span className="text-2xl font-mono font-bold text-white">{decodedMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;