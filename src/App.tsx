// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Transmitter } from './core/Transmitter';
import { Receiver } from './core/Receiver';
import { Encoder } from './protocol/Encoder'; // <--- הייבוא החדש
import { FrequencyVisualizer } from './components/FrequencyVisualizer';

// יוצרים את המשדר מחוץ לקומפוננטה כדי שלא ייווצר מחדש בכל רינדור
const transmitter = new Transmitter();

function App() {
  const [text, setText] = useState('HELLO');
  const [freq, setFreq] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [decodedMsg, setDecodedMsg] = useState(''); // <--- מקום לשמור את ההודעה שתתקבל
  
  const receiverRef = useRef<Receiver | null>(null);

  useEffect(() => {
    // אתחול המקלט
    receiverRef.current = new Receiver();
    
    // הרשמה לעדכונים מהמקלט (תדרים)
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

  const handleSend = async () => {
    if (!text) return;

    // 1. המרה לפרוטוקול שלנו (בינארי + כותרות)
    const encodedPayload = Encoder.encode(text);
    
    // לוג כדי שתוכל לראות את ה"קסם" בקונסול
    console.log(`[App] Original: "${text}"`);
    console.log(`[App] Encoded:  "${encodedPayload}"`);

    // 2. שידור
    await transmitter.transmit(encodedPayload);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 font-sans">
      <h1 className="text-5xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
        SONIC<span className="text-white">GATE</span>
      </h1>

      <div className="grid gap-8 w-full max-w-lg">
        {/* --- אזור השידור --- */}
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
              onClick={handleSend}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-all active:scale-95"
            >
              SEND
            </button>
          </div>
          <div className="mt-2 text-[10px] text-gray-600 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
            Check console (F12) to see binary output
          </div>
        </div>

        {/* --- אזור הקליטה --- */}
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
          
          {/* ויזואליזציה של התדרים */}
          <FrequencyVisualizer currentFreq={freq} />

          {/* מקום להודעה המפורשת (כרגע ריק עד שנחבר את ה-Decoder) */}
          {decodedMsg && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
              <span className="text-xs text-green-400 block mb-1">DECODED MESSAGE</span>
              <span className="text-xl font-mono font-bold text-white tracking-widest">{decodedMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;