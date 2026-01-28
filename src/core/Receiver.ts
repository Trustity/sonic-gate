// src/core/Receiver.ts
import { SonicConfig } from './SonicConfig';
import { Decoder } from '../protocol/Decoder';

export type ReceiverStatus = 'listening' | 'stopped' | 'denied';

export class Receiver {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  // המוח שמפענח את הביטים
  private decoder = new Decoder();
  
  // משתנים לניהול הזמן (סנכרון שעון)
  private isReceiving = false;
  private nextSampleTime = 0;
  private silenceCounter = 0;

  // Callbacks לעדכון ה-UI
  public onStatusChange: (status: ReceiverStatus) => void = () => {};
  public onFrequencyDetected: (freq: number) => void = () => {};
  public onMessageDecoded: (msg: string) => void = () => {};
  public onLog: (log: string) => void = () => {};

  constructor() {
    // 1. חיבור הודעות הצלחה
    this.decoder.onMessageDecoded = (msg) => {
      this.onLog(`✅ DECODED: ${msg}`);
      this.onMessageDecoded(msg);
      this.isReceiving = false; // סיימנו הודעה, חוזרים להמתין
    };
    
    // 2. חיבור לוגים מהדיקודר (כדי לראות SYNC ו-LENGTH)
    this.decoder.onLog = (msg) => this.onLog(msg);

    // 3. עדכון התקדמות (אופציונלי, כדי לא להפציץ את הלוג)
    this.decoder.onProgress = (percent) => {
      if (percent % 20 === 0) this.onLog(`Reading... ${percent}%`);
    }
  }

  async start(): Promise<boolean> {
    try {
      this.onLog('Starting microphone...');
      
      // בדיקה שהדפדפן תומך
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support audio API");
      }

      // יצירת הקונטקסט
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // בקשת הרשאה עם ביטול סינוני רעשים (קריטי!)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      source.connect(this.analyser);
      
      this.onStatusChange('listening');
      this.onLog('Mic active. Waiting for signal...');
      this.loop();
      
      return true; // הצלחה
      
    } catch (err) {
      this.onLog(`Error: ${err}`);
      this.onStatusChange('denied');
      return false; // כישלון
    }
  }

  stop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.mediaStream?.getTracks().forEach(track => track.stop());
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.onStatusChange('stopped');
  }

  private loop = () => {
    if (!this.analyser || !this.audioContext) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // 1. זיהוי התדר
    const freq = this.findDominantFrequency(dataArray);
    this.onFrequencyDetected(freq);

    // 2. המרה לביט (עם טווח סובלנות של 300Hz)
    let currentBit: '0' | '1' | null = null;
    if (Math.abs(freq - SonicConfig.FREQ_ZERO) < 300) currentBit = '0';
    else if (Math.abs(freq - SonicConfig.FREQ_ONE) < 300) currentBit = '1';

    const now = this.audioContext.currentTime;

    // 3. מכונת המצבים
    if (!this.isReceiving) {
      // מצב המתנה
      if (currentBit !== null) {
        this.isReceiving = true;
        this.onLog(`📶 Signal Detected! (${Math.round(freq)}Hz)`);
        // מכוונים לאמצע הביט
        this.nextSampleTime = now + (SonicConfig.BIT_DURATION / 2);
        this.silenceCounter = 0;
      }
    } else {
      // מצב קליטה
      if (now >= this.nextSampleTime) {
        if (currentBit !== null) {
          this.decoder.processBit(currentBit);
          this.silenceCounter = 0;
        } else {
          this.silenceCounter++;
          // --- כאן הגדלנו את הסבלנות ל-60 ---
          if (this.silenceCounter > 60) { 
             if (this.isReceiving) this.onLog('❌ Signal Lost (Too much silence)');
             this.isReceiving = false;
          }
        }
        this.nextSampleTime += SonicConfig.BIT_DURATION;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private findDominantFrequency(dataArray: Uint8Array): number {
    if (!this.audioContext) return 0;
    let maxValue = 0;
    let maxIndex = -1;

    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    // --- כאן הורדנו את סף הרעש ל-10 ---
    if (maxValue < 10) return 0;

    const nyquist = this.audioContext.sampleRate / 2;
    return maxIndex * (nyquist / dataArray.length);
  }
}