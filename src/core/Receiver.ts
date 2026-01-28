// src/core/Receiver.ts
import { SonicConfig } from './SonicConfig';
import { Decoder } from '../protocol/Decoder';

export type ReceiverStatus = 'listening' | 'stopped' | 'denied';

export class Receiver {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  private decoder = new Decoder();
  
  private isReceiving = false;
  private nextSampleTime = 0;
  private silenceCounter = 0;

  public onStatusChange: (status: ReceiverStatus) => void = () => {};
  public onFrequencyDetected: (freq: number) => void = () => {};
  public onMessageDecoded: (msg: string) => void = () => {};

  constructor() {
    this.decoder.onMessageDecoded = (msg) => {
      this.onMessageDecoded(msg);
      this.isReceiving = false;
    };
  }

  async start(): Promise<boolean> {
    try {
      console.log('[Receiver] Starting...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support audio API");
      }

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // ביטול סינוני רעשים כדי לקלוט את הצליל הגולמי
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
      this.loop();
      
      return true;
      
    } catch (err) {
      console.error('[Receiver] Error:', err);
      alert('Microphone Access Error: ' + err); 
      this.onStatusChange('denied');
      return false;
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

    const freq = this.findDominantFrequency(dataArray);
    this.onFrequencyDetected(freq);

    let currentBit: '0' | '1' | null = null;
    
    // --- התיקון הגדול: הרחבנו את הטווח ל-400Hz ---
    // זה יתפוס גם זיופים של הרמקול/מיקרופון
    if (Math.abs(freq - SonicConfig.FREQ_ZERO) < 400) currentBit = '0';
    else if (Math.abs(freq - SonicConfig.FREQ_ONE) < 400) currentBit = '1';

    const now = this.audioContext.currentTime;

    if (!this.isReceiving) {
      if (currentBit !== null) {
        // מתחילים סנכרון רק אם זיהינו ביט ברור
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
          // נותנים לו קצת יותר "חסד" לפני שמתייאשים
          if (this.silenceCounter > 25) { 
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

    // סף רעש מינימלי
    if (maxValue < 30) return 0;

    const nyquist = this.audioContext.sampleRate / 2;
    return maxIndex * (nyquist / dataArray.length);
  }
}