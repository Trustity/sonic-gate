// src/components/FrequencyVisualizer.tsx
import React from 'react';

interface Props {
  currentFreq: number;
}

export const FrequencyVisualizer: React.FC<Props> = ({ currentFreq }) => {
  // חישוב אחוזים לתצוגה ויזואלית
  // אנחנו מודדים כמה קרובים אנחנו לתדרים שלנו
  const isZero = currentFreq > 18300 && currentFreq < 18700;
  const isOne = currentFreq > 19300 && currentFreq < 19700;
  
  return (
    <div className="w-full mt-6 bg-black/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
      <div className="flex justify-between items-end h-32 gap-2">
        {/* עמודה לתדר 0 (18.5k) */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div 
            className={`w-full rounded-t-lg transition-all duration-100 ease-out ${isZero ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-800'}`}
            style={{ height: isZero ? '100%' : '20%' }}
          />
          <span className="text-xs font-mono text-gray-500">BIT 0</span>
        </div>

        {/* עמודה לרעש רקע (סתם בשביל היופי) */}
        <div className="flex-1 flex flex-col items-center gap-2">
           <div 
            className="w-full bg-gray-900 rounded-t-lg transition-all duration-300"
            style={{ height: '10%' }}
          />
           <span className="text-xs font-mono text-gray-700">NOISE</span>
        </div>

        {/* עמודה לתדר 1 (19.5k) */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div 
            className={`w-full rounded-t-lg transition-all duration-100 ease-out ${isOne ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-gray-800'}`}
            style={{ height: isOne ? '100%' : '20%' }}
          />
          <span className="text-xs font-mono text-gray-500">BIT 1</span>
        </div>
      </div>
      
      <div className="mt-4 text-center font-mono text-xs text-gray-400">
        DETECTED: <span className="text-white font-bold">{Math.round(currentFreq)} Hz</span>
      </div>
    </div>
  );
};