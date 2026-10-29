/**
 * AudioFix Studio - Real-Time Web Audio Playback & Analysis Engine
 * 
 * Manages:
 * - Seamless A/B/Delta audio buffer switching at sample-accurate offsets
 * - Real-time 2048-bin FFT Analyser for spectral visualization
 * - Stereo Peak/RMS metering
 * - High-precision timeline transport (play, pause, scrub, loop)
 */

import { MonitorMode } from '../types/audio';

export type PlaybackStateListener = (state: {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}) => void;

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private inputSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private inputAnalyserNode: AnalyserNode | null = null;

  // Active buffers
  private originalBuffer: AudioBuffer | null = null;
  private processedBuffer: AudioBuffer | null = null;
  private deltaBuffer: AudioBuffer | null = null;

  // Transport state
  private monitorMode: MonitorMode = 'processed';
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private isLooping = false;
  private volume = 0.85;

  private stateListeners: Set<PlaybackStateListener> = new Set();
  private animFrameId: number | null = null;

  constructor() {
    // Lazily initialized on first user gesture
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setBuffers(
    original: AudioBuffer | null,
    processed: AudioBuffer | null,
    delta: AudioBuffer | null,
    resetTime = false
  ) {
    this.originalBuffer = original;
    this.processedBuffer = processed;
    this.deltaBuffer = delta;

    if (resetTime) {
      this.pauseOffset = 0;
    }

    // If currently playing, seamlessly hot-swap playback so DSP changes are heard immediately
    if (this.isPlaying) {
      const curTime = this.getCurrentTime();
      this.stopCurrentSource();
      this.pauseOffset = curTime;
      this.play();
    } else {
      this.notifyState();
    }
  }

  public getActiveBuffer(): AudioBuffer | null {
    if (this.monitorMode === 'original') return this.originalBuffer;
    if (this.monitorMode === 'delta') return this.deltaBuffer;
    return this.processedBuffer || this.originalBuffer;
  }

  public getDuration(): number {
    const active = this.getActiveBuffer();
    return active ? active.duration : 0;
  }

  public getCurrentTime(): number {
    if (!this.isPlaying) return this.pauseOffset;
    if (!this.ctx) return 0;
    const dur = this.getDuration();
    if (dur === 0) return 0;

    const elapsed = this.ctx.currentTime - this.startTime + this.pauseOffset;
    return this.isLooping ? elapsed % dur : Math.min(dur, elapsed);
  }

  public async play() {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const buffer = this.getActiveBuffer();
    if (!buffer) return;

    if (this.isPlaying) {
      this.stopCurrentSource();
    }

    this.setupNodes();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = this.isLooping;
    if (this.analyserNode) {
      source.connect(this.analyserNode);
    }

    const curOffset = this.pauseOffset >= buffer.duration ? 0 : this.pauseOffset;
    this.startTime = ctx.currentTime;
    this.pauseOffset = curOffset;
    source.start(0, curOffset);

    // Parallel synchronized inputSource for real-time input VU RMS metering
    if (this.originalBuffer && this.inputAnalyserNode) {
      try {
        const inSrc = ctx.createBufferSource();
        inSrc.buffer = this.originalBuffer;
        inSrc.loop = this.isLooping;
        inSrc.connect(this.inputAnalyserNode);
        inSrc.start(0, curOffset);
        this.inputSource = inSrc;
      } catch (err) {
        console.warn('Could not start input meter source', err);
      }
    }

    source.onended = () => {
      if (this.currentSource === source && !this.isLooping) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        this.cancelTimeTracking();
        this.notifyState();
      }
    };

    this.currentSource = source;
    this.isPlaying = true;
    this.startTimeTracking();
    this.notifyState();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.stopCurrentSource();
    this.isPlaying = false;
    this.cancelTimeTracking();
    this.notifyState();
  }

  public seek(timeSeconds: number) {
    const dur = this.getDuration();
    const clamped = Math.max(0, Math.min(dur, timeSeconds));
    const wasPlaying = this.isPlaying;

    if (wasPlaying) {
      this.stopCurrentSource();
    }
    this.pauseOffset = clamped;

    if (wasPlaying) {
      this.play();
    } else {
      this.notifyState();
    }
  }

  public setMonitorMode(mode: MonitorMode) {
    if (this.monitorMode === mode) return;
    this.monitorMode = mode;

    // Seamless hot-swapping during active playback
    if (this.isPlaying) {
      const curTime = this.getCurrentTime();
      this.stopCurrentSource();
      this.pauseOffset = curTime;
      this.play();
    } else {
      this.notifyState();
    }
  }

  public getMonitorMode(): MonitorMode {
    return this.monitorMode;
  }

  public setLoop(loop: boolean) {
    this.isLooping = loop;
    if (this.currentSource) {
      this.currentSource.loop = loop;
    }
  }

  public getLoop(): boolean {
    return this.isLooping;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getAnalyser(): AnalyserNode | null {
    if (!this.analyserNode && this.ctx) {
      this.setupNodes();
    }
    return this.analyserNode;
  }

  public getInputAnalyser(): AnalyserNode | null {
    if (!this.inputAnalyserNode && this.ctx) {
      this.setupNodes();
    }
    return this.inputAnalyserNode;
  }

  private setupNodes() {
    const ctx = this.getAudioContext();
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
      this.gainNode.connect(ctx.destination);
    }

    if (!this.analyserNode) {
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.82;
      this.analyserNode.connect(this.gainNode);
    }

    if (!this.inputAnalyserNode) {
      this.inputAnalyserNode = ctx.createAnalyser();
      this.inputAnalyserNode.fftSize = 2048;
      this.inputAnalyserNode.smoothingTimeConstant = 0.82;
    }
  }

  private stopCurrentSource() {
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Source already terminated
      }
      this.currentSource = null;
    }

    if (this.inputSource) {
      try {
        this.inputSource.onended = null;
        this.inputSource.stop();
        this.inputSource.disconnect();
      } catch {
        // Source already terminated
      }
      this.inputSource = null;
    }
  }

  /**
   * Helper to compute instantaneous RMS and Peak levels in dBFS for Input and Output
   */
  public getLiveVuLevels(): {
    inputRmsDb: number;
    inputPeakDb: number;
    outputRmsDb: number;
    outputPeakDb: number;
  } {
    const toDb = (val: number) => (val > 0.00001 ? 20 * Math.log10(val) : -60);

    const calcMeter = (analyser: AnalyserNode | null) => {
      if (!analyser || !this.isPlaying) return { rmsDb: -60, peakDb: -60 };
      const timeData = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(timeData);

      let sumSquares = 0;
      let peak = 0;
      for (let i = 0; i < timeData.length; i++) {
        const s = timeData[i];
        const abs = Math.abs(s);
        if (abs > peak) peak = abs;
        sumSquares += s * s;
      }
      const rms = Math.sqrt(sumSquares / timeData.length || 1);
      return {
        rmsDb: Math.max(-60, Math.min(6, toDb(rms))),
        peakDb: Math.max(-60, Math.min(6, toDb(peak))),
      };
    };

    const outLevels = calcMeter(this.analyserNode);
    // If input analyser not playing or same as out, fall back
    const inLevels = calcMeter(this.inputAnalyserNode || this.analyserNode);

    return {
      inputRmsDb: inLevels.rmsDb,
      inputPeakDb: inLevels.peakDb,
      outputRmsDb: outLevels.rmsDb,
      outputPeakDb: outLevels.peakDb,
    };
  }

  private startTimeTracking() {
    this.cancelTimeTracking();
    const tick = () => {
      this.notifyState();
      if (this.isPlaying) {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private cancelTimeTracking() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public subscribe(listener: PlaybackStateListener): () => void {
    this.stateListeners.add(listener);
    listener({
      isPlaying: this.isPlaying,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
    });
    return () => this.stateListeners.delete(listener);
  }

  private notifyState() {
    const payload = {
      isPlaying: this.isPlaying,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
    };
    this.stateListeners.forEach((l) => l(payload));
  }

  public destroy() {
    this.stopCurrentSource();
    this.cancelTimeTracking();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Global player instance
export const audioPlayer = new AudioPlayer();
