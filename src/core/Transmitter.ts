// src/core/Transmitter.ts
import { SonicConfig } from './SonicConfig';

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

  /** מקבל רצף בינארי (0/1) מוכן לשידור - Encoder.encode() */
  public async transmit(binarySequence: string): Promise<void> {
    this.initAudioContext();
    if (!this.audioContext) return;

    if (!/^[01]+$/.test(binarySequence)) {
      console.error('[Transmitter] Invalid binary sequence');
      return;
    }

    console.log(`[Transmitter] Sending ${binarySequence.length} bits`);

    // 2. יצירת הכלים
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // 3. תזמון השידור
    const startTime = this.audioContext.currentTime + 0.1;
    this.scheduleFrequencies(binarySequence, startTime);

    // 4. הפעלה
    this.oscillator.start(startTime);
    
    // 5. עצירה מתוכננת
    const totalDuration = binarySequence.length * SonicConfig.BIT_DURATION;
    this.oscillator.stop(startTime + totalDuration);

    this.oscillator.onended = () => {
      this.cleanup();
      console.log('[Transmitter] Transmission Complete');
    };
  }

  private scheduleFrequencies(sequence: string, startTime: number) {
    if (!this.oscillator || !this.gainNode) return;

    // --- שינוי ווליום ל-0.3 ---
    this.gainNode.gain.setValueAtTime(0, startTime);
    this.gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05); // עליה קצת יותר איטית למניעת "קליק"

    for (let i = 0; i < sequence.length; i++) {
      const bit = sequence[i];
      const time = startTime + (i * SonicConfig.BIT_DURATION);
      const frequency = bit === '1' ? SonicConfig.FREQ_ONE : SonicConfig.FREQ_ZERO;

      this.oscillator.frequency.setValueAtTime(frequency, time);
    }
    
    const endTime = startTime + (sequence.length * SonicConfig.BIT_DURATION);
    this.gainNode.gain.setValueAtTime(0.3, endTime - 0.05);
    this.gainNode.gain.linearRampToValueAtTime(0, endTime);
  }

  private cleanup() {
    this.oscillator?.disconnect();
    this.gainNode?.disconnect();
    this.oscillator = null;
    this.gainNode = null;
  }
}