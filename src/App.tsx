// src/App.tsx דוגמה מהירה
import { useState } from 'react';
import { Transmitter } from './core/Transmitter';

const transmitter = new Transmitter();

function App() {
  const [text, setText] = useState('HELLO');

  const handleSend = () => {
    transmitter.transmit(text);
  };

  return (
    <div className="p-10 bg-gray-900 text-white min-h-screen flex flex-col gap-4 items-center justify-center">
      <h1 className="text-4xl font-mono text-green-500">SonicGate v1.0</h1>
      <input 
        value={text} 
        onChange={e => setText(e.target.value)}
        className="text-black p-2 rounded"
      />
      <button 
        onClick={handleSend}
        className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold"
      >
        TRANSMIT DATA
      </button>
    </div>
  );
}

export default App;