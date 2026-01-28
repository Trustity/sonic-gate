// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Transmitter } from './core/Transmitter';
import { Receiver } from './core/Receiver';
import { FrequencyVisualizer } from './components/FrequencyVisualizer';

const transmitter = new Transmitter();

function App() {
  const [text, setText] = useState('HELLO');
  const [freq, setFreq] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  // אנחנו משתמשים ב-Ref כדי לשמור על האינסטנס של המקלט
  const receiverRef = useRef<Receiver | null>(null);

  useEffect(() => {
    receiverRef.current = new Receiver();
    
    // הרשמה לעדכונים מהמקלט
    receiverRef.current.onFrequencyDetected = (f) => {
      setFreq(f);
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
      await receiverRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 font-sans">
      <h1 className="text-5xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
        SONIC<span className="text-white">GATE</span>
      </h1>

      <div className="grid gap-8 w-full max-w-lg">
        {/* אזור השידור */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
          <label className="text-xs font-bold text-gray-500 mb-2 block tracking-widest">TRANSMITTER</label>
          <div className="flex gap-2">
            <input 
              value={text} 
              onChange={e => setText(e.target.value)}
              className="bg-gray-800 text-white px-4 py-3 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              placeholder="Enter secret..."
            />
            <button 
              onClick={() => transmitter.transmit(text)}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-all active:scale-95"
            >
              SEND
            </button>
          </div>
        </div>

        {/* אזור הקליטה */}
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
        </div>
      </div>
    </div>
  );
}

export default App;