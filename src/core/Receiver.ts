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

  public onStatusChange: (status: ReceiverStatus) => void = () => {};
  public onFrequencyDetected: (freq: number) => void = () => {};
  public onMessageDecoded: (msg: string) => void = () => {};

  constructor() {
    // חיבור ה-Decoder החוצה
    this.decoder.onMessageDecoded = (msg) => {
      this.onMessageDecoded(msg);
      this.isReceiving = false; // סיימנו הודעה, חוזרים להמתין
    };
  }

  // הפונקציה מחזירה אמת/שקר כדי שנדע ב-UI אם זה הצליח
  async start(): Promise<boolean> {
    try {
      console.log('[Receiver] Starting...');
      
      // בדיקה שהדפדפן תומך
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support audio API");
      }

      // יצירת הקונטקסט
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // בקשת הרשאה למיקרופון
      console.log('[Receiver] Requesting mic permission...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Receiver] Permission granted!');
      
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      source.connect(this.analyser);
      
      this.onStatusChange('listening');
      this.loop();
      
      return true; // הצלחה
      
    } catch (err) {
      console.error('[Receiver] Error:', err);
      alert('Microphone Access Error: ' + err); // הקפצת שגיאה למסך
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

    // 2. המרה לביט
    let currentBit: '0' | '1' | null = null;
    if (Math.abs(freq - SonicConfig.FREQ_ZERO) < 200) currentBit = '0';
    else if (Math.abs(freq - SonicConfig.FREQ_ONE) < 200) currentBit = '1';

    const now = this.audioContext.currentTime;

    // 3. מכונת המצבים לסנכרון
    if (!this.isReceiving) {
      if (currentBit !== null) {
        // התחלת שידור מזוהה
        this.isReceiving = true;
        this.nextSampleTime = now + (SonicConfig.BIT_DURATION / 2);
        this.silenceCounter = 0;
      }
    } else {
      if (now >= this.nextSampleTime) {
        if (currentBit !== null) {
          this.decoder.processBit(currentBit);
          this.silenceCounter = 0;
        } else {
          this.silenceCounter++;
          if (this.silenceCounter > 20) { 
            // איבוד סיגנל
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

    if (maxValue < 50) return 0;

    const nyquist = this.audioContext.sampleRate / 2;
    return maxIndex * (nyquist / dataArray.length);
  }
}