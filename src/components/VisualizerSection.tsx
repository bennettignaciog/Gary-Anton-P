import React, { useEffect, useRef, useState } from 'react';
import { MonitorMode, ProcessingStats, AudioFileMetadata } from '../types/audio';
import { audioPlayer } from '../audio/audioPlayer';
import { Activity, Zap, CheckCircle2, Sliders, Waves, Wind } from 'lucide-react';

interface VisualizerSectionProps {
  originalBuffer: AudioBuffer | null;
  processedBuffer: AudioBuffer | null;
  deltaBuffer: AudioBuffer | null;
  metadata: AudioFileMetadata | null;
  stats: ProcessingStats | null;
  monitorMode: MonitorMode;
  isProcessing: boolean;
}

export const VisualizerSection: React.FC<VisualizerSectionProps> = ({
  originalBuffer,
  processedBuffer,
  deltaBuffer,
  metadata,
  stats,
  monitorMode,
  isProcessing,
}) => {
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTab, setActiveTab] = useState<'both' | 'waveform' | 'spectrum'>('both');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    const unsub = audioPlayer.subscribe((state) => {
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
    });
    return unsub;
  }, []);

  // 1. Draw Waveform Canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;

    // 90s Dark VFD Background
    ctx.fillStyle = '#06090f';
    ctx.fillRect(0, 0, w, h);

    // Subtle 90s cathode scanline pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // Grid lines (0dB, -6dB)
    ctx.strokeStyle = '#1a2333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    const activeBuf =
      monitorMode === 'original'
        ? originalBuffer
        : monitorMode === 'delta'
        ? deltaBuffer
        : processedBuffer;

    if (!activeBuf) {
      ctx.fillStyle = '#475569';
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO AUDIO LOADED - INSERT 24-BIT TAPE / FILE BELOW', w / 2, midY);
      return;
    }

    const channelData = activeBuf.getChannelData(0);
    const origData = originalBuffer ? originalBuffer.getChannelData(0) : null;
    const totalSamples = channelData.length;
    const step = Math.max(1, Math.floor(totalSamples / w));

    // Ghosted original
    if (monitorMode === 'processed' && origData) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      for (let x = 0; x < w; x++) {
        const start = Math.floor(x * step);
        const end = Math.min(totalSamples, start + step);
        let min = 1.0;
        let max = -1.0;
        for (let s = start; s < end; s += 2) {
          const val = origData[s];
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const yTop = midY - max * (h * 0.45);
        const yBottom = midY - min * (h * 0.45);
        ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop));
      }
    }

    // Active waveform
    let strokeColor = '#22d3ee'; // Cyan
    let fillColor = 'rgba(34, 211, 238, 0.35)';
    if (monitorMode === 'original') {
      strokeColor = '#f59e0b'; // Amber
      fillColor = 'rgba(245, 158, 11, 0.35)';
    } else if (monitorMode === 'delta') {
      strokeColor = '#c084fc'; // Purple
      fillColor = 'rgba(192, 132, 252, 0.35)';
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;

    for (let x = 0; x < w; x++) {
      const start = Math.floor(x * step);
      const end = Math.min(totalSamples, start + step);
      let min = 1.0;
      let max = -1.0;
      for (let s = start; s < end; s += 2) {
        const val = channelData[s];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const yTop = midY - max * (h * 0.45);
      const yBottom = midY - min * (h * 0.45);
      ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop));
    }

    // Playhead line
    if (duration > 0) {
      const progress = currentTime / duration;
      const playheadX = Math.max(0, Math.min(w, progress * w));

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, 0);
      ctx.lineTo(playheadX + 4, 0);
      ctx.lineTo(playheadX, 7);
      ctx.closePath();
      ctx.fill();
    }
  }, [originalBuffer, processedBuffer, deltaBuffer, monitorMode, currentTime, duration]);

  // 2. Real-Time FFT Spectrum Analyzer
  useEffect(() => {
    let animId: number;
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    const peakHold = new Float32Array(512);

    const renderSpectrum = () => {
      const analyser = audioPlayer.getAnalyser();

      ctx.fillStyle = '#06090f';
      ctx.fillRect(0, 0, w, h);

      // 90s Grid
      const freqs = [
        { label: '50', hz: 50 },
        { label: '200', hz: 200 },
        { label: '1k', hz: 1000 },
        { label: '5k', hz: 5000 },
        { label: '10k', hz: 10000 },
        { label: '20k', hz: 20000 },
      ];

      ctx.strokeStyle = '#121927';
      ctx.lineWidth = 1;
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.fillStyle = '#475569';

      freqs.forEach((f) => {
        const minF = 20;
        const maxF = 22000;
        const logPos = Math.log10(f.hz / minF) / Math.log10(maxF / minF);
        const x = logPos * w;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        ctx.fillText(f.label, x + 3, h - 5);
      });

      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, monitorMode === 'original' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(34, 211, 238, 0.8)');
        grad.addColorStop(1, 'rgba(34, 211, 238, 0.02)');

        ctx.beginPath();
        ctx.moveTo(0, h);

        const points: { x: number; y: number }[] = [];
        const numPoints = 180;

        for (let i = 0; i < numPoints; i++) {
          const ratio = i / (numPoints - 1);
          const bin = Math.min(bufferLength - 1, Math.floor(Math.pow(ratio, 2.2) * (bufferLength - 1)));
          const val = dataArray[bin] / 255;
          const y = h - val * (h * 0.88);
          const x = ratio * w;
          points.push({ x, y });

          if (val > peakHold[i]) {
            peakHold[i] = val;
          } else {
            peakHold[i] = Math.max(0, peakHold[i] - 0.007);
          }
        }

        ctx.lineTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        ctx.lineTo(w, points[points.length - 1].y);
        ctx.lineTo(w, h);
        ctx.closePath();

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = monitorMode === 'original' ? '#f59e0b' : '#22d3ee';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        for (let i = 0; i < numPoints; i += 3) {
          const ratio = i / (numPoints - 1);
          const x = ratio * w;
          const peakY = h - peakHold[i] * (h * 0.88);
          if (peakHold[i] > 0.05) {
            ctx.fillRect(x - 1, peakY - 1, 2, 2);
          }
        }
      }

      animId = requestAnimationFrame(renderSpectrum);
    };

    animId = requestAnimationFrame(renderSpectrum);
    return () => cancelAnimationFrame(animId);
  }, [monitorMode]);

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || duration === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, x / rect.width));
    audioPlayer.seek(clickRatio * duration);
  };

  return (
    <div className="space-y-4">
      {/* 90s Rack Chassis Display */}
      <div className="rack-chassis rounded-xl overflow-hidden">
        {/* Chassis Bar */}
        <div className="px-4 py-2 bg-[#0c1018] border-b border-slate-700/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold font-mono tracking-wider text-cyan-400 flex items-center gap-1.5 uppercase">
              <Waves className="w-4 h-4" />
              <span>VFD OSCILLOSCOPE & FFT ANALYZER</span>
            </span>

            <span className="text-xs font-mono text-slate-400">
              AUDITION:{' '}
              <span
                className={`font-bold ${
                  monitorMode === 'processed'
                    ? 'text-cyan-400'
                    : monitorMode === 'original'
                    ? 'text-amber-400'
                    : 'text-purple-400'
                }`}
              >
                {monitorMode === 'processed'
                  ? 'PROCESSED 24-BIT'
                  : monitorMode === 'original'
                  ? 'RAW ORIGINAL'
                  : 'DELTA NOISE'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#06090f] border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-2.5 py-0.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'both' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              SPLIT
            </button>
            <button
              onClick={() => setActiveTab('waveform')}
              className={`px-2.5 py-0.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'waveform' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              WAVE
            </button>
            <button
              onClick={() => setActiveTab('spectrum')}
              className={`px-2.5 py-0.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'spectrum' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              FFT
            </button>
          </div>
        </div>

        {/* Display Screens */}
        <div className="p-3 bg-[#06090f]">
          <div className={`grid gap-3 ${activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {(activeTab === 'both' || activeTab === 'waveform') && (
              <div className="relative">
                <div className="absolute top-2 left-3 z-10 flex items-center gap-2 pointer-events-none">
                  <span className="text-[10px] font-mono tracking-wider text-slate-400 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded">
                    TIME DOMAIN
                  </span>
                </div>
                <canvas
                  ref={waveformCanvasRef}
                  onClick={handleWaveformClick}
                  className="w-full h-44 rounded cursor-crosshair border border-slate-800/80"
                  style={{ display: 'block' }}
                />
              </div>
            )}

            {(activeTab === 'both' || activeTab === 'spectrum') && (
              <div className="relative">
                <div className="absolute top-2 left-3 z-10 flex items-center gap-2 pointer-events-none">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded">
                    FFT SPECTRUM (20Hz - 20kHz)
                  </span>
                </div>
                <canvas
                  ref={spectrumCanvasRef}
                  className="w-full h-44 rounded border border-slate-800/80"
                  style={{ display: 'block' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 90s VFD Telemetry Data Screen */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="bg-[#0e1320] border border-slate-800 rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400">CLIPPED PEAKS</span>
            <span className="text-base font-bold font-vfd text-amber-400 mt-1">
              {stats.clippedPeaksRestored}
            </span>
          </div>

          <div className="bg-[#0e1320] border border-slate-800 rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400">CLICKS REMOVED</span>
            <span className="text-base font-bold font-vfd text-cyan-400 mt-1">
              {stats.clicksRemoved + stats.cracklesTamed}
            </span>
          </div>

          <div className="bg-[#0e1320] border border-slate-800 rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400">BREATHS TAMED</span>
            <span className="text-base font-bold font-vfd text-emerald-400 mt-1">
              {stats.breathsSuppressed}
            </span>
          </div>

          <div className="bg-[#0e1320] border border-slate-800 rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400">MOUTH SMACKS</span>
            <span className="text-base font-bold font-vfd text-cyan-400 mt-1">
              {stats.mouthClicksSuppressed}
            </span>
          </div>

          <div className="bg-[#0e1320] border border-slate-800 rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400">PLOSIVE POPS</span>
            <span className="text-base font-bold font-vfd text-amber-400 mt-1">
              {stats.plosivesAttenuated}
            </span>
          </div>

          <div className="bg-[#0e1320] border border-slate-800 rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400">GAIN AUTOMATION</span>
            <span className="text-base font-bold font-vfd text-cyan-300 mt-1">
              {stats.averageGainAdjustmentDb >= 0 ? `+${stats.averageGainAdjustmentDb}` : stats.averageGainAdjustmentDb} dB
            </span>
          </div>

          <div className="bg-[#0e1320] border border-slate-800 rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400">DSP LATENCY</span>
            <span className="text-base font-bold font-vfd text-slate-200 mt-1">
              {stats.processingDurationMs} ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
