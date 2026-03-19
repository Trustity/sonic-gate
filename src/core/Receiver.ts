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
  // Majority voting: אוספים דגימות לכל ביט
  private bitSamples: ('0' | '1')[] = [];

  // Callbacks לעדכון ה-UI
  public onStatusChange: (status: ReceiverStatus) => void = () => {};
  public onFrequencyDetected: (freq: number) => void = () => {};
  public onMessageDecoded: (msg: string) => void = () => {};
  public onProgress: (percent: number) => void = () => {};
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

    this.decoder.onProgress = (percent) => this.onProgress(percent);
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
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.5;
      
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

  reset() {
    this.decoder.reset();
    this.isReceiving = false;
    this.bitSamples = [];
    this.silenceCounter = 0;
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
if (Math.abs(freq - SonicConfig.FREQ_ZERO) < 400) currentBit = '0';
    else if (Math.abs(freq - SonicConfig.FREQ_ONE) < 400) currentBit = '1';
    const now = this.audioContext.currentTime;

    // 3. מכונת המצבים
    if (!this.isReceiving) {
      if (currentBit !== null) {
        this.isReceiving = true;
        this.bitSamples = [];
        this.onLog(`📶 Signal Detected! (${Math.round(freq)}Hz)`);
        this.nextSampleTime = now + SonicConfig.BIT_DURATION * 0.6; // דילוג על תחילת הביט הראשון
        this.silenceCounter = 0;
      }
    } else {
      if (currentBit !== null) {
        this.bitSamples.push(currentBit);
        this.silenceCounter = 0;
      } else {
        this.silenceCounter++;
        if (this.silenceCounter > 90) {
          this.onLog('❌ Signal Lost');
          this.isReceiving = false;
          this.bitSamples = [];
        }
      }
      if (now >= this.nextSampleTime) {
        const resolved = this.resolveBit();
        if (resolved !== null) {
          this.decoder.processBit(resolved);
        }
        this.bitSamples = [];
        this.nextSampleTime += SonicConfig.BIT_DURATION;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private resolveBit(): '0' | '1' | null {
    if (this.bitSamples.length === 0) return null;
    const zeros = this.bitSamples.filter((b) => b === '0').length;
    const ones = this.bitSamples.length - zeros;
    return zeros >= ones ? '0' : '1';
  }

  private findDominantFrequency(dataArray: Uint8Array): number {
    if (!this.audioContext) return 0;
    
    const nyquist = this.audioContext.sampleRate / 2;
    // חישוב כמה הרץ מייצג כל "תא" במערך
    const binSize = nyquist / dataArray.length;
    
    // --- התיקון: מתחילים לחפש רק מ-1000Hz ומעלה ---
    // זה יסנן את ה-47Hz ואת כל הרעשים של המזגן/חשמל
    const startIndex = Math.floor(800 / binSize); 

    let maxValue = 0;
    let maxIndex = -1;

    // הלולאה מתחילה מ-startIndex ולא מ-0
    for (let i = startIndex; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    // סף רעש מינימלי (נשאר רגיש)
    if (maxValue < 10) return 0;

    return maxIndex * binSize;
  }
}