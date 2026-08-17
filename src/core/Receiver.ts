import { SonicConfig } from '../core/SonicConfig';
import { Decoder } from '../protocol/Decoder';
import { detectFskBit } from '../utils/Goertzel';

export type ReceiverStatus = 'listening' | 'stopped' | 'denied';

export type ReceiverActivity =
  | 'idle'
  | 'listening'
  | 'signal_detected'
  | 'decoding'
  | 'finalizing'
  | 'signal_lost'
  | 'decode_timeout';

type Phase = 'idle' | 'receiving' | 'finalizing';

export class Receiver {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private timeDomain = new Float32Array(2048);

  private decoder = new Decoder();
  private phase: Phase = 'idle';

  private signalStartMs = 0;
  /** Index of the bit window currently being sampled. */
  private activeBitIndex = 0;
  private bitVotes: ('0' | '1')[] = [];
  private silenceFrames = 0;
  private finalizeStartMs = 0;
  private bitsFed = 0;

  public onStatusChange: (status: ReceiverStatus) => void = () => {};
  public onActivityChange: (activity: ReceiverActivity) => void = () => {};
  public onFrequencyDetected: (freq: number) => void = () => {};
  public onMicLevel: (level: number) => void = () => {};
  public onMessageDecoded: (msg: string) => void = () => {};
  public onAckReceived: (chunkIndex: number) => void = () => {};
  public onProgress: (percent: number) => void = () => {};
  public onLog: (log: string) => void = () => {};

  constructor() {
    this.decoder.onMessageDecoded = (msg) => {
      this.onLog(`✅ DECODED: ${msg.slice(0, 40)}${msg.length > 40 ? '…' : ''}`);
      this.onMessageDecoded(msg);
      this.resetCapture();
      this.emitActivity('idle');
    };
    this.decoder.onAckReceived = (idx) => {
      this.onAckReceived(idx);
      this.resetCapture();
      this.emitActivity('idle');
    };
    this.decoder.onLog = (msg) => this.onLog(msg);
    this.decoder.onProgress = (percent) => {
      this.onProgress(percent);
      if (percent > 0) this.emitActivity('decoding');
    };
  }

  private emitActivity(activity: ReceiverActivity) {
    this.onActivityChange(activity);
  }

  getDecoder(): Decoder {
    return this.decoder;
  }

  async start(): Promise<boolean> {
    try {
      this.onLog('Starting microphone…');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support audio API');
      }

      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.15;
      this.timeDomain = new Float32Array(this.analyser.fftSize);

      source.connect(this.analyser);

      this.onStatusChange('listening');
      this.onLog('Mic active. Waiting for signal…');
      this.emitActivity('listening');
      this.loop();

      return true;
    } catch (err) {
      this.onLog(`Error: ${err}`);
      this.onStatusChange('denied');
      return false;
    }
  }

  reset() {
    this.decoder.reset();
    this.resetCapture();
    if (this.analyser) this.emitActivity('listening');
  }

  stop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.mediaStream?.getTracks().forEach((track) => track.stop());

    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }

    this.onStatusChange('stopped');
    this.onMicLevel(0);
    this.phase = 'idle';
    this.emitActivity('idle');
  }

  private resetCapture() {
    this.phase = 'idle';
    this.signalStartMs = 0;
    this.activeBitIndex = 0;
    this.bitVotes = [];
    this.silenceFrames = 0;
    this.finalizeStartMs = 0;
    this.bitsFed = 0;
    if (this.analyser) this.emitActivity('listening');
  }

  private bitDurationMs(): number {
    return SonicConfig.BIT_DURATION * 1000;
  }

  private flushCurrentBitWindow() {
    if (this.bitVotes.length === 0) return;
    const zeros = this.bitVotes.filter((b) => b === '0').length;
    const ones = this.bitVotes.length - zeros;
    this.decoder.processBit(zeros >= ones ? '0' : '1');
    this.bitsFed++;
    this.bitVotes = [];
    if (this.decoder.isBusy()) this.emitActivity('decoding');
  }

  private advanceCompletedBits(now: number) {
    const completedIndex = Math.floor((now - this.signalStartMs) / this.bitDurationMs());
    while (this.activeBitIndex < completedIndex) {
      this.flushCurrentBitWindow();
      this.activeBitIndex++;
    }
  }

  private enterFinalize() {
    if (this.phase === 'finalizing') return;
    this.phase = 'finalizing';
    this.finalizeStartMs = performance.now();
    this.flushCurrentBitWindow();
    this.onLog('⏳ Transmission ended — finishing decode…');
    this.emitActivity('finalizing');
  }

  private loop = () => {
    if (!this.analyser || !this.audioContext) return;

    this.analyser.getFloatTimeDomainData(this.timeDomain);
    const sampleRate = this.audioContext.sampleRate;

    let rms = 0;
    for (let i = 0; i < this.timeDomain.length; i++) {
      rms += this.timeDomain[i] * this.timeDomain[i];
    }
    rms = Math.sqrt(rms / this.timeDomain.length);
    this.onMicLevel(Math.min(1, rms * 5));

    const bit = detectFskBit(
      this.timeDomain,
      sampleRate,
      SonicConfig.FREQ_ZERO,
      SonicConfig.FREQ_ONE,
    );

    if (bit === '0') this.onFrequencyDetected(SonicConfig.FREQ_ZERO);
    else if (bit === '1') this.onFrequencyDetected(SonicConfig.FREQ_ONE);

    const now = performance.now();

    if (this.phase === 'idle') {
      if (bit !== null) {
        this.phase = 'receiving';
        this.signalStartMs = now;
        this.activeBitIndex = 0;
        this.bitVotes = [bit];
        this.silenceFrames = 0;
        this.bitsFed = 0;
        this.onLog(`📶 Signal detected (${bit === '0' ? SonicConfig.FREQ_ZERO : SonicConfig.FREQ_ONE} Hz)`);
        this.emitActivity('signal_detected');
      }
    } else if (this.phase === 'receiving') {
      if (bit !== null) {
        this.bitVotes.push(bit);
        this.silenceFrames = 0;
      } else {
        this.silenceFrames++;
        if (this.silenceFrames >= 18) this.enterFinalize();
      }
      this.advanceCompletedBits(now);
    } else if (this.phase === 'finalizing') {
      this.advanceCompletedBits(now);
      this.flushCurrentBitWindow();

      if (!this.decoder.isBusy()) {
        if (this.bitsFed === 0) {
          this.onLog('❌ No valid frame decoded');
          this.emitActivity('signal_lost');
        }
        this.resetCapture();
      } else if (now - this.finalizeStartMs > 4000) {
        this.onLog('❌ Decode timeout — partial frame discarded');
        this.decoder.reset();
        this.emitActivity('decode_timeout');
        this.resetCapture();
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
