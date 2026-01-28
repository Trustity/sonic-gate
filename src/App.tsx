// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Transmitter } from './core/Transmitter';
import { Receiver } from './core/Receiver';
import { Encoder } from './protocol/Encoder';
import { FrequencyVisualizer } from './components/FrequencyVisualizer';

// יוצרים את המשדר מחוץ לקומפוננטה
const transmitter = new Transmitter();

function App() {
  const [text, setText] = useState('HELLO');
  const [freq, setFreq] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [decodedMsg, setDecodedMsg] = useState('');
  
  const receiverRef = useRef<Receiver | null>(null);

  useEffect(() => {
    receiverRef.current = new Receiver();
    
    // עדכון תדר לגרף
    receiverRef.current.onFrequencyDetected = (f) => {
      setFreq(f);
    };

    // קבלת הודעה מפוענחת
    receiverRef.current.onMessageDecoded = (msg) => {
      console.log('Successfully decoded message:', msg);
      setDecodedMsg(msg);
      
      // רטט בטלפון
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    };

    return () => {
      receiverRef.current?.stop();
    };
  }, []);

  const toggleListen = async () => {
    if (isListening) {
      // כיבוי
      receiverRef.current?.stop();
      setIsListening(false);
    } else {
      // הדלקה - ממתינים לראות אם הצליח
      const success = await receiverRef.current?.start();
      
      if (success) {
        setIsListening(true);
        setDecodedMsg(''); // ניקוי הודעה קודמת
      } else {
        // אם נכשל (למשל המשתמש לא אישר מיקרופון), נשארים כבויים
        setIsListening(false);
      }
    }
  };

  const handleSend = async () => {
    if (!text) return;

    // המרה לבינארי
    const encodedPayload = Encoder.encode(text);
    
    console.log(`[App] Sending: "${text}"`);
    console.log(`[App] Binary payload: ${encodedPayload}`);

    // שידור
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
          <div className="mt-2 text-[10px] text-gray-600 font-mono">
            Transmits via ultrasonic audio (18.5kHz - 19.5kHz)
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
          
          <FrequencyVisualizer currentFreq={freq} />

          {decodedMsg && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-center animate-pulse">
              <span className="text-[10px] text-green-400 block mb-1 tracking-widest uppercase">Decoded Payload</span>
              <span className="text-2xl font-mono font-bold text-white break-all drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                {decodedMsg}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-gray-600 text-xs font-mono">
        Status: {isListening ? 'LISTENING...' : 'IDLE'}
      </div>
    </div>
  );
}

export default App;