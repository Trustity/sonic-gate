import { SonicConfig } from '../core/SonicConfig';
import { Decoder } from '../protocol/Decoder';

export type ReceiverStatus = 'listening' | 'stopped' | 'denied';

export type ReceiverActivity =
  | 'idle'
  | 'listening'
  | 'signal_detected'
  | 'decoding'
  | 'signal_lost'
  | 'decode_timeout';

export class Receiver {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  private decoder = new Decoder();

  private isReceiving = false;
  private nextSampleTime = 0;
  private silenceCounter = 0;
  private bitSamples: ('0' | '1')[] = [];

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
      this.isReceiving = false;
      this.emitActivity('idle');
    };
    this.decoder.onAckReceived = (idx) => {
      this.onAckReceived(idx);
      this.isReceiving = false;
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

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.5;

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
    this.isReceiving = false;
    this.bitSamples = [];
    this.silenceCounter = 0;
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
    this.emitActivity('idle');
  }

  /** ~60 animation frames; scale with baud so long v2 frames are not cut off. */
  private silenceLimit(): number {
    const bitMs = SonicConfig.BIT_DURATION * 1000;
    const frameMs = 16;
    // Allow ~1.5 s of quiet while syncing; much longer once payload decode started.
    const base = this.decoder.isBusy() ? Math.ceil((bitMs * 200) / frameMs) : Math.ceil(1500 / frameMs);
    return Math.max(90, base);
  }

  private loop = () => {
    if (!this.analyser || !this.audioContext) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let peak = 0;
    const startIndex = Math.floor(800 / ((this.audioContext.sampleRate / 2) / dataArray.length));
    for (let i = startIndex; i < dataArray.length; i++) {
      if (dataArray[i] > peak) peak = dataArray[i];
    }
    this.onMicLevel(Math.min(1, peak / 96));

    const freq = this.findDominantFrequency(dataArray);
    this.onFrequencyDetected(freq);

    let currentBit: '0' | '1' | null = null;
    if (Math.abs(freq - SonicConfig.FREQ_ZERO) < SonicConfig.FREQ_TOLERANCE) {
      currentBit = '0';
    } else if (Math.abs(freq - SonicConfig.FREQ_ONE) < SonicConfig.FREQ_TOLERANCE) {
      currentBit = '1';
    }

    const now = this.audioContext.currentTime;

    if (!this.isReceiving) {
      if (currentBit !== null) {
        this.isReceiving = true;
        this.bitSamples = [];
        this.onLog(`📶 Signal detected (${Math.round(freq)} Hz)`);
        this.nextSampleTime = now + SonicConfig.BIT_DURATION * 0.5;
        this.silenceCounter = 0;
        this.emitActivity('signal_detected');
      }
    } else {
      if (currentBit !== null) {
        this.bitSamples.push(currentBit);
        this.silenceCounter = 0;
        if (this.decoder.isBusy()) this.emitActivity('decoding');
      } else {
        this.silenceCounter++;
        const limit = this.silenceLimit();
        if (this.silenceCounter > limit) {
          if (this.decoder.isBusy()) {
            this.onLog('❌ Decode timeout — partial frame discarded');
            this.decoder.reset();
            this.emitActivity('decode_timeout');
          } else {
            this.onLog('❌ Signal lost');
            this.emitActivity('signal_lost');
          }
          this.isReceiving = false;
          this.bitSamples = [];
          this.silenceCounter = 0;
          if (this.analyser) this.emitActivity('listening');
        }
      }
      if (now >= this.nextSampleTime) {
        const resolved = this.resolveBit();
        if (resolved !== null) {
          this.decoder.processBit(resolved);
          if (this.decoder.isBusy()) this.emitActivity('decoding');
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
    const binSize = nyquist / dataArray.length;
    const startIndex = Math.floor(800 / binSize);

    let maxValue = 0;
    let maxIndex = -1;

    for (let i = startIndex; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    if (maxValue < 10) return 0;
    return maxIndex * binSize;
  }
}
