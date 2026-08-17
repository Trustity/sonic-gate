import { SonicConfig } from './SonicConfig';

export type TransmitPhase = 'idle' | 'transmitting';

export class Transmitter {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  public onPhaseChange: (phase: TransmitPhase) => void = () => {};

  private async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public async transmit(binarySequence: string): Promise<void> {
    await this.initAudioContext();
    if (!this.audioContext) return;

    if (!/^[01]+$/.test(binarySequence)) {
      console.error('[Transmitter] Invalid binary sequence');
      return;
    }

    this.onPhaseChange('transmitting');

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    const startTime = this.audioContext.currentTime + 0.1;
    this.scheduleFrequencies(binarySequence, startTime);

    this.oscillator.start(startTime);

    const totalDuration = binarySequence.length * SonicConfig.BIT_DURATION;
    this.oscillator.stop(startTime + totalDuration);

    return new Promise((resolve) => {
      if (!this.oscillator) {
        this.onPhaseChange('idle');
        resolve();
        return;
      }
      this.oscillator.onended = () => {
        this.cleanup();
        this.onPhaseChange('idle');
        resolve();
      };
    });
  }

  private scheduleFrequencies(sequence: string, startTime: number) {
    if (!this.oscillator || !this.gainNode) return;

    this.gainNode.gain.setValueAtTime(0, startTime);
    this.gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);

    for (let i = 0; i < sequence.length; i++) {
      const bit = sequence[i];
      const time = startTime + i * SonicConfig.BIT_DURATION;
      const frequency = bit === '1' ? SonicConfig.FREQ_ONE : SonicConfig.FREQ_ZERO;
      this.oscillator.frequency.setValueAtTime(frequency, time);
    }

    const endTime = startTime + sequence.length * SonicConfig.BIT_DURATION;
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
