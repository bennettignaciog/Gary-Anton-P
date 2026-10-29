/**
 * VOXRACK - Audio Types & State Definitions
 */

export interface AudioFileMetadata {
  name: string;
  sampleRate: number;
  numberOfChannels: number;
  bitDepth: number;
  duration: number;
  originalSize: number;
  format: string;
  peakDbFS: number;
  rmsDbFS: number;
}

export type VocalMode = 'lead' | 'background';

export interface LeadLevelerSettings {
  enabled: boolean;
  targetRmsDb: number; // e.g. -18 dBFS
  speed: 'transparent' | 'natural' | 'tight'; // Attack/release profile
  maxBoostDb: number; // e.g. +6 dB
  maxCutDb: number; // e.g. -6 dB
  preserveVocalDynamics: boolean;
}

export interface BackgroundLevelerSettings {
  enabled: boolean;
  targetRmsDb: number; // e.g. -22 dBFS
  balanceRatio: number; // 0.0 to 1.0 (smooth blend)
  harmonyDucking: boolean;
}

export interface DeclipSettings {
  enabled: boolean;
  thresholdDb: number; // -3.0 dBFS to -0.1 dBFS
  headroomExpansionDb: number; // 0.5 to 3.0 dB safety margin
  interpolationMode: 'cubic' | 'spline';
}

export interface DeclickSettings {
  enabled: boolean;
  sensitivity: number; // 1 to 10
  maxGlitchMs: number; // 0.5ms to 4.0ms
}

export interface DecrackleSettings {
  enabled: boolean;
  intensity: number; // 1 to 10
  smoothHighFreq: boolean;
}

export interface MouthDeclickSettings {
  enabled: boolean;
  sensitivity: number; // 1 to 10
  frequencyCenterKhz: number; // 2.5 to 7.0 kHz
}

export interface DeplosiveSettings {
  enabled: boolean;
  cutoffHz: number; // 80 to 160 Hz
  sensitivity: number; // 1 to 10
  bodyWarmth: number; // Preserve fundamental resonance (0 to 100%)
}

// FabFilter Pro-Q style Visual Parametric Equalizer
export type ParametricFilterType =
  | 'bell'
  | 'lowshelf'
  | 'highshelf'
  | 'lowcut'
  | 'highcut'
  | 'notch'
  | 'bandpass';

export interface ParametricBand {
  id: string;
  enabled: boolean;
  filterType: ParametricFilterType;
  freqHz: number; // 20 to 20000 Hz
  gainDb: number; // -18 to +18 dB
  q: number; // 0.1 to 18.0
  dynamic: boolean; // Dynamic EQ mode
  dynamicRangeDb: number; // -18 to +18 dB
  thresholdDb: number; // -48 to 0 dBFS
  color: string;
}

export interface ParametricEqSettings {
  enabled: boolean;
  linearPhase: boolean; // Zero-phase forward-backward processing
  bands: ParametricBand[];
}

// Debreath Module
export interface DebreathSettings {
  enabled: boolean;
  mode: 'attenuate' | 'mute';
  reductionDb: number; // -6 to -36 dB
  sensitivity: number; // 1 to 10
  smoothOnsetMs: number; // 5 to 40 ms
}

export interface ModuleSettings {
  leadLeveler: LeadLevelerSettings;
  backgroundLeveler: BackgroundLevelerSettings;
  declip: DeclipSettings;
  declick: DeclickSettings;
  decrackle: DecrackleSettings;
  mouthDeclick: MouthDeclickSettings;
  deplosive: DeplosiveSettings;
  parametricEq: ParametricEqSettings;
  debreath: DebreathSettings;
}

export interface ProcessingStats {
  clippedPeaksRestored: number;
  clicksRemoved: number;
  cracklesTamed: number;
  mouthClicksSuppressed: number;
  plosivesAttenuated: number;
  breathsSuppressed: number;
  parametricBandsActive: number;
  averageGainAdjustmentDb: number;
  peakDbBefore: number;
  peakDbAfter: number;
  rmsDbBefore: number;
  rmsDbAfter: number;
  processingDurationMs: number;
}

export type MonitorMode = 'processed' | 'original' | 'delta';

export interface AudioEngineState {
  originalBuffer: AudioBuffer | null;
  processedBuffer: AudioBuffer | null;
  deltaBuffer: AudioBuffer | null;
  metadata: AudioFileMetadata | null;
  stats: ProcessingStats | null;
  isProcessing: boolean;
  monitorMode: MonitorMode;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  volume: number;
}
