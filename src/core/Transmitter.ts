// src/core/Transmitter.ts
import { SonicConfig } from './SonicConfig';
import { BinaryUtils } from '../utils/BinaryUtils';

export class Transmitter {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    // אנחנו מאתחלים את ה-Context רק בפעולה הראשונה כדי לא לעצבן את הדפדפן
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public async transmit(text: string): Promise<void> {
    this.initAudioContext();
    if (!this.audioContext) return;

    // 1. המרת הטקסט לביטים + הוספת פתיח
    const rawBinary = BinaryUtils.stringToBinary(text);
    const fullSequence = SonicConfig.START_TOKEN + rawBinary;

    console.log(`[Transmitter] Sending: ${text}`);
    console.log(`[Transmitter] Binary Sequence: ${fullSequence}`);

    // 2. יצירת הכלים
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // 3. תזמון השידור
    const startTime = this.audioContext.currentTime + 0.1;
    this.scheduleFrequencies(fullSequence, startTime);

    // 4. הפעלה
    this.oscillator.start(startTime);
    
    // 5. עצירה מתוכננת
    const totalDuration = fullSequence.length * SonicConfig.BIT_DURATION;
    this.oscillator.stop(startTime + totalDuration);

    this.oscillator.onended = () => {
      this.cleanup();
      console.log('[Transmitter] Transmission Complete');
    };
  }

  private scheduleFrequencies(sequence: string, startTime: number) {
    if (!this.oscillator || !this.gainNode) return;

    // --- התיקון הגדול: שינוי הווליום ל-0.1 ---
    
    // התחלה: עולים מאפס ל-0.1 (במקום ל-1)
    this.gainNode.gain.setValueAtTime(0, startTime);
    this.gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.01);

    for (let i = 0; i < sequence.length; i++) {
      const bit = sequence[i];
      const time = startTime + (i * SonicConfig.BIT_DURATION);
      const frequency = bit === '1' ? SonicConfig.FREQ_ONE : SonicConfig.FREQ_ZERO;

      this.oscillator.frequency.setValueAtTime(frequency, time);
    }
    
    // סיום: יורדים מ-0.1 לאפס
    const endTime = startTime + (sequence.length * SonicConfig.BIT_DURATION);
    this.gainNode.gain.setValueAtTime(0.1, endTime - 0.01);
    this.gainNode.gain.linearRampToValueAtTime(0, endTime);
  }

  private cleanup() {
    this.oscillator?.disconnect();
    this.gainNode?.disconnect();
    this.oscillator = null;
    this.gainNode = null;
  }
}