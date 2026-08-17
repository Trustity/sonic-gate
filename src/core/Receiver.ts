import { SonicConfig } from '../core/SonicConfig';
import { decodeAlignedBitStream } from '../protocol/AcousticAlign';
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

const SAMPLE_MS = 16;

export class Receiver {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private timeDomain = new Float32Array(2048);

  private phase: Phase = 'idle';
  private rawStream = '';
  private bitVotes: ('0' | '1')[] = [];
  private msInCurrentBit = 0;
  private silenceMs = 0;
  private finalizeStartMs = 0;
  private decodedThisCapture = false;

  public onStatusChange: (status: ReceiverStatus) => void = () => {};
  public onActivityChange: (activity: ReceiverActivity) => void = () => {};
  public onFrequencyDetected: (freq: number) => void = () => {};
  public onMicLevel: (level: number) => void = () => {};
  public onMessageDecoded: (msg: string) => void = () => {};
  public onAckReceived: (chunkIndex: number) => void = () => {};
  public onProgress: (percent: number) => void = () => {};
  public onLog: (log: string) => void = () => {};

  getDecoder() {
    return null;
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
      this.analyser.smoothingTimeConstant = 0.08;
      this.timeDomain = new Float32Array(this.analyser.fftSize);
      source.connect(this.analyser);

      this.onStatusChange('listening');
      this.onLog('Mic active. Waiting for signal…');
      this.emitActivity('listening');
      this.sampleTimer = setInterval(() => this.sampleTick(), SAMPLE_MS);
      this.loop();

      return true;
    } catch (err) {
      this.onLog(`Error: ${err}`);
      this.onStatusChange('denied');
      return false;
    }
  }

  reset() {
    this.resetCapture();
    if (this.analyser) this.emitActivity('listening');
  }

  stop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.sampleTimer) clearInterval(this.sampleTimer);
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }
    this.onStatusChange('stopped');
    this.onMicLevel(0);
    this.phase = 'idle';
    this.emitActivity('idle');
  }

  private emitActivity(activity: ReceiverActivity) {
    this.onActivityChange(activity);
  }

  private resetCapture() {
    this.phase = 'idle';
    this.rawStream = '';
    this.bitVotes = [];
    this.msInCurrentBit = 0;
    this.silenceMs = 0;
    this.finalizeStartMs = 0;
    this.decodedThisCapture = false;
    this.onProgress(0);
    if (this.analyser) this.emitActivity('listening');
  }

  private bitDurationMs(): number {
    return SonicConfig.BIT_DURATION * 1000;
  }

  private appendBit(bit: '0' | '1') {
    this.rawStream += bit;
    const expected = Math.max(48, this.rawStream.length);
    this.onProgress(Math.min(99, Math.round((this.rawStream.length / expected) * 100)));
    if (this.rawStream.length > 16) this.emitActivity('decoding');
  }

  private resolveWindow(): '0' | '1' | null {
    if (this.bitVotes.length === 0) return null;
    const zeros = this.bitVotes.filter((b) => b === '0').length;
    const ones = this.bitVotes.length - zeros;
    return zeros >= ones ? '0' : '1';
  }

  private enterFinalize() {
    if (this.phase === 'finalizing') return;
    this.phase = 'finalizing';
    this.finalizeStartMs = performance.now();
    this.onLog('⏳ Transmission ended — aligning & decoding…');
    this.emitActivity('finalizing');
    void this.runAlignedDecode();
  }

  private async runAlignedDecode() {
    await new Promise((r) => setTimeout(r, 80));

    const pending = this.resolveWindow();
    if (pending) this.appendBit(pending);
    this.bitVotes = [];

    const hit = decodeAlignedBitStream(this.rawStream, (m) => this.onLog(m));

    if (hit?.kind === 'message') {
      this.decodedThisCapture = true;
      this.onLog(`✅ DECODED: ${hit.text.slice(0, 40)}${hit.text.length > 40 ? '…' : ''}`);
      this.onMessageDecoded(hit.text);
      this.resetCapture();
      this.emitActivity('idle');
      return;
    }

    if (hit?.kind === 'ack') {
      this.decodedThisCapture = true;
      this.onLog(`✅ ACK for chunk ${hit.index}`);
      this.onAckReceived(hit.index);
      this.resetCapture();
      this.emitActivity('idle');
      return;
    }

    if (this.rawStream.length > 20) {
      this.onLog('❌ Could not decode frame — try Slow, hold devices closer');
      this.emitActivity('decode_timeout');
    } else {
      this.onLog('❌ No frame detected');
      this.emitActivity('signal_lost');
    }
    this.resetCapture();
  }

  private sampleTick() {
    if (!this.analyser || !this.audioContext || this.phase === 'idle') return;

    this.analyser.getFloatTimeDomainData(this.timeDomain);
    const bit = detectFskBit(
      this.timeDomain,
      this.audioContext.sampleRate,
      SonicConfig.FREQ_ZERO,
      SonicConfig.FREQ_ONE,
      1.15,
    );

    if (this.phase === 'receiving') {
      if (bit !== null) {
        this.bitVotes.push(bit);
        this.silenceMs = 0;
      } else {
        this.silenceMs += SAMPLE_MS;
        if (this.silenceMs >= 320) this.enterFinalize();
      }

      this.msInCurrentBit += SAMPLE_MS;
      if (this.msInCurrentBit >= this.bitDurationMs()) {
        const resolved = this.resolveWindow();
        if (resolved) this.appendBit(resolved);
        this.bitVotes = [];
        this.msInCurrentBit = 0;
      }
    } else if (this.phase === 'finalizing') {
      this.msInCurrentBit += SAMPLE_MS;
      if (bit !== null) this.bitVotes.push(bit);
      if (this.msInCurrentBit >= this.bitDurationMs()) {
        const resolved = this.resolveWindow();
        if (resolved) this.appendBit(resolved);
        this.bitVotes = [];
        this.msInCurrentBit = 0;
      }
      if (performance.now() - this.finalizeStartMs > 6000 && !this.decodedThisCapture) {
        this.onLog('❌ Decode timeout');
        this.emitActivity('decode_timeout');
        this.resetCapture();
      }
    }
  }

  private loop = () => {
    if (!this.analyser || !this.audioContext) return;

    this.analyser.getFloatTimeDomainData(this.timeDomain);
    let rms = 0;
    for (let i = 0; i < this.timeDomain.length; i++) {
      rms += this.timeDomain[i] * this.timeDomain[i];
    }
    rms = Math.sqrt(rms / this.timeDomain.length);
    this.onMicLevel(Math.min(1, rms * 5));

    const bit = detectFskBit(
      this.timeDomain,
      this.audioContext.sampleRate,
      SonicConfig.FREQ_ZERO,
      SonicConfig.FREQ_ONE,
      1.15,
    );

    if (bit === '0') this.onFrequencyDetected(SonicConfig.FREQ_ZERO);
    else if (bit === '1') this.onFrequencyDetected(SonicConfig.FREQ_ONE);

    if (this.phase === 'idle' && bit !== null) {
      this.phase = 'receiving';
      this.rawStream = '';
      this.bitVotes = [bit];
      this.msInCurrentBit = 0;
      this.silenceMs = 0;
      this.decodedThisCapture = false;
      this.onLog(`📶 Signal detected (${bit === '0' ? SonicConfig.FREQ_ZERO : SonicConfig.FREQ_ONE} Hz)`);
      this.emitActivity('signal_detected');
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
