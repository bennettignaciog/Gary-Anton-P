/**
 * VOXRACK - 90s Rackmount Vocal Leveler & Audio Restoration Suite
 *
 * Main Application Component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { VisualizerSection } from './components/VisualizerSection';
import { ModuleRack } from './components/ModuleRack';
import { FileLoader } from './components/FileLoader';
import { AudioInfoSection } from './components/AudioInfoSection';
import { HistoryDrawer } from './components/HistoryDrawer';
import {
  ModuleSettings,
  ProcessingStats,
  AudioFileMetadata,
  MonitorMode,
} from './types/audio';
import { audioPlayer } from './audio/audioPlayer';
import { processAudioBuffer } from './audio/dspEngine';
import { generateDemoAudioBuffer, DEMO_STEMS } from './audio/demoSamples';
import { encode24BitWav, inspectAudioHeader, downloadAudioFile } from './audio/wavEncoder';
import { saveHistoryToFirestore } from './db/historyService';
import { useUndoRedo } from './hooks/useUndoRedo';
import { Sparkles } from 'lucide-react';

const DEFAULT_SETTINGS: ModuleSettings = {
  leadLeveler: {
    enabled: true,
    targetRmsDb: -18,
    speed: 'natural',
    maxBoostDb: 6,
    maxCutDb: 6,
    preserveVocalDynamics: true,
  },
  backgroundLeveler: {
    enabled: false,
    targetRmsDb: -22,
    balanceRatio: 0.8,
    harmonyDucking: true,
  },
  declip: {
    enabled: true,
    thresholdDb: -0.6,
    headroomExpansionDb: 1.5,
    interpolationMode: 'cubic',
  },
  declick: {
    enabled: true,
    sensitivity: 6,
    maxGlitchMs: 2.0,
  },
  decrackle: {
    enabled: false,
    intensity: 4,
    smoothHighFreq: true,
  },
  mouthDeclick: {
    enabled: true,
    sensitivity: 7,
    frequencyCenterKhz: 4.2,
  },
  deplosive: {
    enabled: true,
    cutoffHz: 115,
    sensitivity: 7,
    bodyWarmth: 85,
  },
  parametricEq: {
    enabled: true,
    linearPhase: true,
    bands: [
      { id: 'b1', enabled: true, filterType: 'lowcut', freqHz: 80, gainDb: 0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#06b6d4' },
      { id: 'b2', enabled: true, filterType: 'bell', freqHz: 320, gainDb: -1.5, q: 1.6, dynamic: true, dynamicRangeDb: -2.5, thresholdDb: -16, color: '#f59e0b' },
      { id: 'b3', enabled: true, filterType: 'bell', freqHz: 2800, gainDb: +2.0, q: 1.2, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#ec4899' },
      { id: 'b4', enabled: true, filterType: 'bell', freqHz: 6200, gainDb: -1.0, q: 2.2, dynamic: true, dynamicRangeDb: -3.5, thresholdDb: -14, color: '#10b981' },
      { id: 'b5', enabled: true, filterType: 'highshelf', freqHz: 11500, gainDb: +2.5, q: 0.9, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#8b5cf6' },
    ],
  },
  debreath: {
    enabled: true,
    mode: 'attenuate',
    reductionDb: 18,
    sensitivity: 7,
    smoothOnsetMs: 15,
  },
};

export default function App() {
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [deltaBuffer, setDeltaBuffer] = useState<AudioBuffer | null>(null);

  const [metadata, setMetadata] = useState<AudioFileMetadata | null>(null);
  const [stats, setStats] = useState<ProcessingStats | null>(null);

  // Undo/Redo stack for ModuleRack settings
  const {
    state: settings,
    set: setSettings,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength,
  } = useUndoRedo<ModuleSettings>(DEFAULT_SETTINGS);

  const [monitorMode, setMonitorMode] = useState<MonitorMode>('processed');
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>('lead-vocal-clipped');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const isInitialLoad = useRef(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Keyboard shortcuts for Undo (Ctrl/Cmd+Z) and Redo (Ctrl/Cmd+Y or Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const computeLevels = (buf: AudioBuffer): { peakDb: number; rmsDb: number } => {
    let peak = 0;
    let sumSquares = 0;
    const totalSamples = buf.length * buf.numberOfChannels;

    for (let c = 0; c < buf.numberOfChannels; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < buf.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
        sumSquares += data[i] * data[i];
      }
    }

    const rms = Math.sqrt(sumSquares / (totalSamples || 1));
    const toDb = (linear: number) => (linear > 0.000001 ? Math.max(-96, 20 * Math.log10(linear)) : -96);
    return {
      peakDb: Number(toDb(peak).toFixed(1)),
      rmsDb: Number(toDb(rms).toFixed(1)),
    };
  };

  // Run DSP processing and persist snapshot to Firebase
  const executeProcessing = useCallback(
    async (source: AudioBuffer, currentSettings: ModuleSettings, fileName: string, saveToDb = true) => {
      setIsProcessing(true);
      try {
        const audioCtx = audioPlayer.getAudioContext();
        const result = await processAudioBuffer(audioCtx, source, currentSettings);

        setProcessedBuffer(result.processedBuffer);
        setDeltaBuffer(result.deltaBuffer);
        setStats(result.stats);

        audioPlayer.setBuffers(source, result.processedBuffer, result.deltaBuffer);

        // Save session history to Firebase Firestore
        if (saveToDb) {
          const statsSummary = `${result.stats.clippedPeaksRestored} peaks, ${result.stats.clicksRemoved} clicks, ${result.stats.breathsSuppressed} breaths, ${result.stats.averageGainAdjustmentDb >= 0 ? `+${result.stats.averageGainAdjustmentDb}` : result.stats.averageGainAdjustmentDb}dB gain`;
          saveHistoryToFirestore({
            id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fileName,
            format: '24-bit PCM WAV',
            sampleRate: source.sampleRate,
            bitDepth: 24,
            createdAt: new Date().toISOString(),
            statsSummary,
            stats: result.stats,
            settings: currentSettings,
          }).catch((err) => console.warn('Could not auto-save history to Firestore:', err));
        }
      } catch (err) {
        console.error('DSP processing failed', err);
        showToast('Processing error. Please adjust rack parameters.');
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Load demo stem
  const loadDemoStem = useCallback(
    async (stemId: string) => {
      const stem = DEMO_STEMS.find((s) => s.id === stemId);
      if (!stem) return;

      setSelectedDemoId(stemId);
      const audioCtx = audioPlayer.getAudioContext();
      const buffer = generateDemoAudioBuffer(audioCtx, stemId);
      setOriginalBuffer(buffer);

      const levels = computeLevels(buffer);
      const meta: AudioFileMetadata = {
        name: `${stem.name}.wav`,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels,
        bitDepth: 24,
        duration: buffer.duration,
        originalSize: buffer.length * buffer.numberOfChannels * 3,
        format: '24-bit Broadcast WAV',
        peakDbFS: levels.peakDb,
        rmsDbFS: levels.rmsDb,
      };
      setMetadata(meta);

      await executeProcessing(buffer, settings, meta.name, false);
      showToast(`Loaded ${stem.name} - VOXRACK ready.`);
    },
    [executeProcessing, settings]
  );

  // Initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadDemoStem('lead-vocal-clipped');
    }
  }, [loadDemoStem]);

  // Handle local user file upload
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setSelectedDemoId(null);
      const arrayBuffer = await file.arrayBuffer();
      const headerInfo = inspectAudioHeader(arrayBuffer);

      const audioCtx = audioPlayer.getAudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      setOriginalBuffer(decoded);

      const levels = computeLevels(decoded);
      const meta: AudioFileMetadata = {
        name: file.name,
        sampleRate: decoded.sampleRate,
        numberOfChannels: decoded.numberOfChannels,
        bitDepth: headerInfo.bitDepth || 24,
        duration: decoded.duration,
        originalSize: file.size,
        format: headerInfo.format || 'Audio',
        peakDbFS: levels.peakDb,
        rmsDbFS: levels.rmsDb,
      };
      setMetadata(meta);

      await executeProcessing(decoded, settings, file.name, true);
      showToast(`Loaded ${file.name} into VOXRACK (${meta.sampleRate}Hz, ${meta.bitDepth}-bit).`);
    } catch (err) {
      console.error('File decoding failed', err);
      showToast('Could not decode audio. Please ensure it is a valid WAV, FLAC, AIFF, or MP3 file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run processing when settings change
  const handleApplySettings = () => {
    if (!originalBuffer || !metadata) return;
    executeProcessing(originalBuffer, settings, metadata.name, true);
    showToast('Executed VOXRACK DSP pass & saved session to Firebase.');
  };

  // Recall settings from history or presets
  const handleRecallSettings = (recalledSettings: ModuleSettings, title: string) => {
    setSettings(recalledSettings, true);
    if (originalBuffer && metadata) {
      executeProcessing(originalBuffer, recalledSettings, metadata.name, true);
    }
    setIsHistoryOpen(false);
    showToast(`Recalled rack settings from "${title}".`);
  };

  // Monitor mode change
  const handleMonitorModeChange = (mode: MonitorMode) => {
    setMonitorMode(mode);
    audioPlayer.setMonitorMode(mode);
  };

  // Lossless 24-bit WAV export
  const handleExport = () => {
    if (!processedBuffer || !metadata) return;
    try {
      const wavBlob = encode24BitWav(processedBuffer);
      downloadAudioFile(wavBlob, metadata.name, '_VOXRACK_24bit.wav');
      showToast(`Exported 24-bit PCM WAV (${(wavBlob.size / 1024 / 1024).toFixed(2)} MB).`);
    } catch (err) {
      console.error('Export failed', err);
      showToast('Export failed. Please check memory limits.');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar with VOXRACK branding */}
      <Header
        onExport={handleExport}
        hasAudio={!!processedBuffer}
        isProcessing={isProcessing}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#101726] border border-cyan-500/50 text-cyan-200 px-4 py-3 rounded-xl shadow-2xl shadow-cyan-950/60 flex items-center gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-bottom-3 duration-200">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 90s Rack Hero Banner */}
        <section className="text-center max-w-3xl mx-auto space-y-2 pt-1 pb-1">
          <div className="inline-flex items-center gap-2 bg-[#121927] border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>VOXRACK DSP-2400 · 90s VINTAGE RACKMOUNT ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase font-mono">
            VOXRACK Vocal Studio
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Visual Parametric EQ (FabFilter style), Debreath, Spline Declip, and Vocal Leveling with lossless 24-bit PCM export and cloud session memory.
          </p>
        </section>

        {/* File Ingestion & Stems Quick Select */}
        <FileLoader
          onFileUpload={handleFileUpload}
          onSelectDemo={loadDemoStem}
          onExport={handleExport}
          selectedDemoId={selectedDemoId}
          metadata={metadata}
          isProcessing={isProcessing}
        />

        {/* 90s VFD Oscilloscope & FFT Spectrum Visualizer */}
        <VisualizerSection
          originalBuffer={originalBuffer}
          processedBuffer={processedBuffer}
          deltaBuffer={deltaBuffer}
          metadata={metadata}
          stats={stats}
          monitorMode={monitorMode}
          isProcessing={isProcessing}
        />

        {/* Transport Bar */}
        <TransportBar
          monitorMode={monitorMode}
          onMonitorModeChange={handleMonitorModeChange}
          hasAudio={!!processedBuffer}
          isProcessing={isProcessing}
        />

        {/* Pro-Audio Processing Rack with Undo/Redo & 10-Band Dynamic EQ */}
        <ModuleRack
          settings={settings}
          onSettingsChange={(newSettings) => {
            setSettings(newSettings, true);
            if (originalBuffer && metadata) {
              executeProcessing(originalBuffer, newSettings, metadata.name, false);
            }
          }}
          onApply={handleApplySettings}
          isProcessing={isProcessing}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          historyLength={historyLength}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />

        {/* Editorial Breakdown, How It Works & Format Integrity Matrix */}
        <AudioInfoSection onScrollToTop={scrollToTop} />
      </main>

      {/* Cloud History & Presets Drawer (Firebase Firestore) */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRecallSettings={handleRecallSettings}
        currentSettings={settings}
      />
    </div>
  );
}
