import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ParametricEqSettings,
  ParametricBand,
  ParametricFilterType,
} from '../types/audio';
import { audioPlayer } from '../audio/audioPlayer';
import {
  Sliders,
  Plus,
  Trash2,
  Power,
  RotateCcw,
  Zap,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ParametricEqFabFilterProps {
  settings: ParametricEqSettings;
  onChange: (newSettings: ParametricEqSettings) => void;
}

const BAND_COLORS = [
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#14b8a6', // Teal
];

const FILTER_TYPES: { type: ParametricFilterType; label: string; icon: string }[] = [
  { type: 'bell', label: 'Bell', icon: '⌢' },
  { type: 'lowshelf', label: 'Low Shelf', icon: '⌐' },
  { type: 'highshelf', label: 'High Shelf', icon: '¬' },
  { type: 'lowcut', label: 'Low Cut', icon: '╱' },
  { type: 'highcut', label: 'High Cut', icon: '╲' },
  { type: 'notch', label: 'Notch', icon: '∨' },
  { type: 'bandpass', label: 'Band Pass', icon: '∧' },
];

export const ParametricEqFabFilter: React.FC<ParametricEqFabFilterProps> = ({
  settings,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedBandId, setSelectedBandId] = useState<string | null>(
    settings.bands.length > 0 ? settings.bands[0].id : null
  );
  const [draggingBandId, setDraggingBandId] = useState<string | null>(null);
  const [hoveredBandId, setHoveredBandId] = useState<string | null>(null);

  const selectedBand = settings.bands.find((b) => b.id === selectedBandId);

  // Frequency to Canvas X (logarithmic: 20 Hz to 20,000 Hz)
  const freqToX = useCallback((f: number, width: number) => {
    const minF = 20;
    const maxF = 20000;
    const clampedF = Math.max(minF, Math.min(maxF, f));
    return (Math.log10(clampedF / minF) / Math.log10(maxF / minF)) * width;
  }, []);

  // Canvas X to Frequency
  const xToFreq = useCallback((x: number, width: number) => {
    const minF = 20;
    const maxF = 20000;
    const ratio = Math.max(0, Math.min(1, x / width));
    return Math.round(minF * Math.pow(maxF / minF, ratio));
  }, []);

  // Gain dB to Canvas Y (-18 dB to +18 dB)
  const gainToY = useCallback((gainDb: number, height: number) => {
    const midY = height / 2;
    const maxDb = 18;
    const clamped = Math.max(-maxDb, Math.min(maxDb, gainDb));
    return midY - (clamped / maxDb) * (height * 0.42);
  }, []);

  // Canvas Y to Gain dB
  const yToGain = useCallback((y: number, height: number) => {
    const midY = height / 2;
    const maxDb = 18;
    const deltaY = midY - y;
    const gain = (deltaY / (height * 0.42)) * maxDb;
    return Number(Math.max(-18, Math.min(18, gain)).toFixed(1));
  }, []);

  // Calculate biquad response at frequency f for a given band
  const calcBandGainAtFreq = (f: number, band: ParametricBand): number => {
    if (!band.enabled) return 0;
    const fs = 48000;
    const fc = Math.max(10, Math.min(band.freqHz, fs * 0.48));
    const Q = Math.max(0.1, band.q);
    const gain = band.gainDb;
    const w = (2 * Math.PI * f) / fs;
    const w0 = (2 * Math.PI * fc) / fs;
    const alpha = Math.sin(w0) / (2 * Q);
    const A = Math.pow(10, gain / 40);

    // Simplified frequency response approximations for visualization
    const logRatio = Math.log2(f / fc);
    const bandwidth = 1.0 / Q;

    switch (band.filterType) {
      case 'bell': {
        const falloff = 1.0 / (1.0 + Math.pow(logRatio / (bandwidth * 0.5), 2));
        return gain * falloff;
      }
      case 'lowshelf': {
        if (f <= fc) return gain;
        const decay = Math.max(0, 1 - (Math.log2(f / fc) / 2));
        return gain * Math.pow(decay, 2);
      }
      case 'highshelf': {
        if (f >= fc) return gain;
        const decay = Math.max(0, 1 - (Math.log2(fc / f) / 2));
        return gain * Math.pow(decay, 2);
      }
      case 'lowcut': {
        if (f >= fc) return 0;
        const octavesBelow = Math.log2(fc / f);
        return -octavesBelow * 18; // -18dB/octave slope
      }
      case 'highcut': {
        if (f <= fc) return 0;
        const octavesAbove = Math.log2(f / fc);
        return -octavesAbove * 18;
      }
      case 'notch': {
        const dist = Math.abs(logRatio);
        return dist < bandwidth * 0.3 ? -24 : 0;
      }
      case 'bandpass': {
        const falloff = 1.0 / (1.0 + Math.pow(logRatio / (bandwidth * 0.4), 2));
        return (falloff - 1) * 24;
      }
      default:
        return 0;
    }
  };

  // Canvas render loop with real-time FFT spectrum and composite FabFilter curve
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
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

    const render = () => {
      // 1. FabFilter Dark Grid Background
      ctx.fillStyle = '#070a10';
      ctx.fillRect(0, 0, w, h);

      // Grid frequencies
      const gridFreqs = [
        { f: 20, label: '20' },
        { f: 50, label: '50' },
        { f: 100, label: '100' },
        { f: 200, label: '200' },
        { f: 500, label: '500' },
        { f: 1000, label: '1k' },
        { f: 2000, label: '2k' },
        { f: 5000, label: '5k' },
        { f: 10000, label: '10k' },
        { f: 20000, label: '20k' },
      ];

      ctx.strokeStyle = '#121926';
      ctx.lineWidth = 1;
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.fillStyle = '#334155';

      gridFreqs.forEach(({ f, label }) => {
        const x = freqToX(f, w);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        ctx.fillText(label, x + 3, h - 6);
      });

      // Decibel lines (+18, +12, +6, 0, -6, -12, -18)
      const dbs = [18, 12, 6, 0, -6, -12, -18];
      dbs.forEach((db) => {
        const y = gainToY(db, h);
        ctx.strokeStyle = db === 0 ? '#1e293b' : '#0f172a';
        ctx.lineWidth = db === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        ctx.fillStyle = db === 0 ? '#64748b' : '#334155';
        ctx.fillText(`${db > 0 ? `+${db}` : db} dB`, 6, y - 3);
      });

      // 2. Real-Time FFT Spectrum in background (Cyan/Amber phosphor glow)
      const analyser = audioPlayer.getAnalyser();
      if (analyser) {
        const binCount = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(binCount);
        analyser.getByteFrequencyData(dataArray);

        ctx.beginPath();
        ctx.moveTo(0, h);

        const numPoints = 140;
        for (let i = 0; i < numPoints; i++) {
          const ratio = i / (numPoints - 1);
          const f = 20 * Math.pow(20000 / 20, ratio);
          const bin = Math.min(binCount - 1, Math.floor((f / 24000) * binCount));
          const val = dataArray[bin] / 255;
          const y = h - val * (h * 0.75);
          const x = ratio * w;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const fftGrad = ctx.createLinearGradient(0, 0, 0, h);
        fftGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
        fftGrad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
        ctx.fillStyle = fftGrad;
        ctx.fill();
      }

      // 3. Composite EQ Response Curve
      if (settings.enabled && settings.bands.length > 0) {
        const numCurvePoints = 220;
        const curvePoints: { x: number; y: number }[] = [];

        for (let i = 0; i < numCurvePoints; i++) {
          const x = (i / (numCurvePoints - 1)) * w;
          const f = xToFreq(x, w);

          let totalGain = 0;
          for (const band of settings.bands) {
            totalGain += calcBandGainAtFreq(f, band);
          }

          const y = gainToY(totalGain, h);
          curvePoints.push({ x, y });
        }

        // Fill under composite curve
        ctx.beginPath();
        ctx.moveTo(0, midY);
        curvePoints.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(w, midY);
        ctx.closePath();

        const curveGrad = ctx.createLinearGradient(0, 0, 0, h);
        curveGrad.addColorStop(0, 'rgba(34, 211, 238, 0.28)');
        curveGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.05)');
        curveGrad.addColorStop(1, 'rgba(245, 158, 11, 0.15)');
        ctx.fillStyle = curveGrad;
        ctx.fill();

        // Stroke composite curve
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (let i = 1; i < curvePoints.length; i++) {
          const prev = curvePoints[i - 1];
          const curr = curvePoints[i];
          const midX = (prev.x + curr.x) / 2;
          const midYPos = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midYPos);
        }
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 4. Draw Interactive Band Nodes
      settings.bands.forEach((band, idx) => {
        const x = freqToX(band.freqHz, w);
        const y = gainToY(band.gainDb, h);
        const isSelected = band.id === selectedBandId;
        const isHovered = band.id === hoveredBandId;

        // Band drop-line to center
        ctx.strokeStyle = `${band.color}40`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Outer focus halo if selected
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, 2 * Math.PI);
          ctx.strokeStyle = band.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Dynamic range ring if dynamic EQ is enabled
          if (band.dynamic) {
            const dynY = gainToY(band.gainDb + band.dynamicRangeDb, h);
            ctx.strokeStyle = '#f59e0b';
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, dynY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(x, y, isSelected || isHovered ? 9 : 7, 0, 2 * Math.PI);
        ctx.fillStyle = band.enabled ? band.color : '#475569';
        ctx.fill();
        ctx.strokeStyle = '#070a10';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Band number text
        ctx.fillStyle = '#070a10';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${idx + 1}`, x, y);

        // Tooltip text above node if selected or hovered
        if (isSelected || isHovered) {
          const text = `${band.freqHz >= 1000 ? `${(band.freqHz / 1000).toFixed(1)}k` : `${band.freqHz}`}Hz · ${band.gainDb > 0 ? `+${band.gainDb}` : band.gainDb}dB · Q:${band.q}`;
          ctx.font = '10px "Share Tech Mono", monospace';
          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.fillText(text, Math.max(60, Math.min(w - 60, x)), y - 18);
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    settings,
    selectedBandId,
    hoveredBandId,
    freqToX,
    xToFreq,
    gainToY,
    yToGain,
  ]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked close to an existing band node
    for (const band of settings.bands) {
      const bx = freqToX(band.freqHz, rect.width);
      const by = gainToY(band.gainDb, rect.height);
      const dist = Math.hypot(clickX - bx, clickY - by);
      if (dist < 18) {
        setSelectedBandId(band.id);
        setDraggingBandId(band.id);
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggingBandId) {
      const newFreq = xToFreq(mouseX, rect.width);
      const newGain = yToGain(mouseY, rect.height);

      const updated = settings.bands.map((b) =>
        b.id === draggingBandId
          ? {
              ...b,
              freqHz: newFreq,
              gainDb: b.filterType === 'lowcut' || b.filterType === 'highcut' ? 0 : newGain,
            }
          : b
      );
      onChange({ ...settings, bands: updated });
    } else {
      // Check hover
      let foundHover: string | null = null;
      for (const band of settings.bands) {
        const bx = freqToX(band.freqHz, rect.width);
        const by = gainToY(band.gainDb, rect.height);
        if (Math.hypot(mouseX - bx, mouseY - by) < 18) {
          foundHover = band.id;
          break;
        }
      }
      setHoveredBandId(foundHover);
    }
  };

  const handleMouseUp = () => {
    setDraggingBandId(null);
  };

  // Mouse wheel adjusts Q / bandwidth
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!selectedBandId) return;

    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const updated = settings.bands.map((b) => {
      if (b.id === selectedBandId) {
        const nextQ = Number(Math.max(0.1, Math.min(18.0, b.q + delta)).toFixed(2));
        return { ...b, q: nextQ };
      }
      return b;
    });
    onChange({ ...settings, bands: updated });
  };

  // Double-click canvas to add a new band
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newFreq = xToFreq(clickX, rect.width);
    const newGain = yToGain(clickY, rect.height);

    const newBand: ParametricBand = {
      id: `band_${Date.now()}`,
      enabled: true,
      filterType: 'bell',
      freqHz: newFreq,
      gainDb: newGain,
      q: 1.4,
      dynamic: false,
      dynamicRangeDb: -6,
      thresholdDb: -18,
      color: BAND_COLORS[settings.bands.length % BAND_COLORS.length],
    };

    const newBands = [...settings.bands, newBand].sort((a, b) => a.freqHz - b.freqHz);
    onChange({ ...settings, bands: newBands });
    setSelectedBandId(newBand.id);
  };

  // Preset curves
  const applyEqPreset = (preset: string) => {
    let newBands: ParametricBand[] = [];

    if (preset === 'vocal-air-clarity') {
      newBands = [
        { id: 'b1', enabled: true, filterType: 'lowcut', freqHz: 80, gainDb: 0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[0] },
        { id: 'b2', enabled: true, filterType: 'bell', freqHz: 350, gainDb: -2.5, q: 1.6, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[1] },
        { id: 'b3', enabled: true, filterType: 'bell', freqHz: 2800, gainDb: +2.0, q: 1.2, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[2] },
        { id: 'b4', enabled: true, filterType: 'bell', freqHz: 6500, gainDb: -1.5, q: 2.2, dynamic: true, dynamicRangeDb: -4.0, thresholdDb: -14, color: BAND_COLORS[3] },
        { id: 'b5', enabled: true, filterType: 'highshelf', freqHz: 11000, gainDb: +3.5, q: 0.8, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[4] },
      ];
    } else if (preset === 'warmth-demud') {
      newBands = [
        { id: 'b1', enabled: true, filterType: 'lowcut', freqHz: 75, gainDb: 0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[0] },
        { id: 'b2', enabled: true, filterType: 'lowshelf', freqHz: 160, gainDb: +2.0, q: 0.9, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[1] },
        { id: 'b3', enabled: true, filterType: 'bell', freqHz: 500, gainDb: -3.0, q: 1.8, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[2] },
        { id: 'b4', enabled: true, filterType: 'bell', freqHz: 3200, gainDb: +1.5, q: 1.4, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[3] },
        { id: 'b5', enabled: true, filterType: 'highshelf', freqHz: 12000, gainDb: +2.0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[4] },
      ];
    } else if (preset === 'dynamic-de-ess') {
      newBands = [
        { id: 'b1', enabled: true, filterType: 'lowcut', freqHz: 85, gainDb: 0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[0] },
        { id: 'b2', enabled: true, filterType: 'bell', freqHz: 6200, gainDb: 0, q: 3.5, dynamic: true, dynamicRangeDb: -6.0, thresholdDb: -16, color: BAND_COLORS[1] },
        { id: 'b3', enabled: true, filterType: 'bell', freqHz: 8400, gainDb: 0, q: 3.0, dynamic: true, dynamicRangeDb: -5.0, thresholdDb: -18, color: BAND_COLORS[2] },
      ];
    } else if (preset === 'flat') {
      newBands = [
        { id: 'b1', enabled: true, filterType: 'lowcut', freqHz: 60, gainDb: 0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[0] },
        { id: 'b2', enabled: true, filterType: 'bell', freqHz: 250, gainDb: 0, q: 1.4, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[1] },
        { id: 'b3', enabled: true, filterType: 'bell', freqHz: 1000, gainDb: 0, q: 1.4, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[2] },
        { id: 'b4', enabled: true, filterType: 'bell', freqHz: 4000, gainDb: 0, q: 1.4, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[3] },
        { id: 'b5', enabled: true, filterType: 'highshelf', freqHz: 10000, gainDb: 0, q: 0.8, dynamic: false, dynamicRangeDb: 0, thresholdDb: 0, color: BAND_COLORS[4] },
      ];
    }

    onChange({ ...settings, bands: newBands });
    if (newBands.length > 0) setSelectedBandId(newBands[0].id);
  };

  const updateSelectedBand = (patch: Partial<ParametricBand>) => {
    if (!selectedBandId) return;
    const updated = settings.bands.map((b) => (b.id === selectedBandId ? { ...b, ...patch } : b));
    onChange({ ...settings, bands: updated });
  };

  const deleteSelectedBand = () => {
    if (!selectedBandId || settings.bands.length <= 1) return;
    const remaining = settings.bands.filter((b) => b.id !== selectedBandId);
    onChange({ ...settings, bands: remaining });
    setSelectedBandId(remaining[0]?.id || null);
  };

  const addNewBand = () => {
    const newBand: ParametricBand = {
      id: `band_${Date.now()}`,
      enabled: true,
      filterType: 'bell',
      freqHz: 1000,
      gainDb: +2.0,
      q: 1.4,
      dynamic: false,
      dynamicRangeDb: -6,
      thresholdDb: -18,
      color: BAND_COLORS[settings.bands.length % BAND_COLORS.length],
    };
    const newBands = [...settings.bands, newBand].sort((a, b) => a.freqHz - b.freqHz);
    onChange({ ...settings, bands: newBands });
    setSelectedBandId(newBand.id);
  };

  return (
    <div
      className={`rounded-xl border transition-all p-4 ${
        settings.enabled
          ? 'rack-chassis border-cyan-500/50 shadow-2xl shadow-cyan-950/30'
          : 'bg-[#0f141f] border-slate-800/80 opacity-80'
      }`}
    >
      {/* FabFilter Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-[10px] font-mono text-slate-300 select-none shadow-sm">
            +
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-widest text-cyan-400 font-mono">
                FAB-Q4 PRO
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Visual Parametric Equalizer
              </h3>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.5 rounded">
                Dynamic & Zero-Phase
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive multi-band spectrum display with real-time FFT glow, node dragging, and dynamic EQ
            </p>
          </div>
        </div>

        {/* Header Controls: Presets, Phase, Add Band, Power */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Linear Phase Toggle */}
          <button
            type="button"
            disabled={!settings.enabled}
            onClick={() => onChange({ ...settings, linearPhase: !settings.linearPhase })}
            className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              settings.linearPhase
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {settings.linearPhase ? 'Phase: Linear / Zero' : 'Phase: Minimum'}
          </button>

          {/* Quick Vocal Curve Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => applyEqPreset('vocal-air-clarity')}
              className="px-2 py-1 text-xs font-mono rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
            >
              Air & Clarity
            </button>
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => applyEqPreset('warmth-demud')}
              className="px-2 py-1 text-xs font-mono rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors"
            >
              Warm Chest
            </button>
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => applyEqPreset('dynamic-de-ess')}
              className="px-2 py-1 text-xs font-mono rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-pink-300 border border-slate-700 transition-colors"
            >
              Dynamic De-Ess
            </button>
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => applyEqPreset('flat')}
              title="Reset EQ Flat"
              className="p-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            disabled={!settings.enabled}
            onClick={addNewBand}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Band</span>
          </button>

          {/* Main Bypass Power */}
          <label className="relative inline-flex items-center cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>
      </div>

      {/* Interactive Visual Canvas Area */}
      <div className="pt-3 pb-3">
        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#070a10] shadow-inner">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            className="w-full h-64 sm:h-72 cursor-crosshair"
            style={{ display: 'block' }}
          />

          {/* Helper hint */}
          <div className="absolute top-2 right-3 pointer-events-none text-[10px] font-mono text-slate-500 flex items-center gap-2 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            <span>Drag node = Freq/Gain</span>
            <span>·</span>
            <span>Wheel = Q</span>
            <span>·</span>
            <span>Double-click = New Band</span>
          </div>
        </div>
      </div>

      {/* Floating FabFilter-Style Band HUD & Inspector Bar */}
      {selectedBand && (
        <div className="bg-[#0b0f17] border border-slate-700/80 rounded-lg p-3 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Band identity & Shape Selector */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                style={{ backgroundColor: selectedBand.color }}
              />
              <span className="text-xs font-mono font-bold text-white uppercase">
                Band {settings.bands.findIndex((b) => b.id === selectedBand.id) + 1}
              </span>
              <button
                type="button"
                onClick={() => updateSelectedBand({ enabled: !selectedBand.enabled })}
                className={`p-1 rounded text-xs transition-colors ${
                  selectedBand.enabled ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-500 bg-slate-800'
                }`}
                title="Bypass Band"
              >
                <Power className="w-3 h-3" />
              </button>
            </div>

            {/* Shape selection buttons */}
            <div className="flex items-center bg-[#06090f] border border-slate-800 p-0.5 rounded">
              {FILTER_TYPES.map(({ type, label, icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateSelectedBand({ filterType: type })}
                  title={label}
                  className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                    selectedBand.filterType === type
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold mr-1">{icon}</span>
                  <span className="hidden xl:inline text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Numerical Controls: Freq, Gain, Q */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            {/* Frequency */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Freq</span>
              <input
                type="range"
                min={20}
                max={20000}
                value={selectedBand.freqHz}
                onChange={(e) => updateSelectedBand({ freqHz: parseInt(e.target.value) })}
                className="w-16 h-1 bg-slate-800 rounded appearance-none accent-cyan-400"
              />
              <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums min-w-[50px]">
                {selectedBand.freqHz >= 1000
                  ? `${(selectedBand.freqHz / 1000).toFixed(2)}k`
                  : `${selectedBand.freqHz}`}Hz
              </span>
            </div>

            {/* Gain (if applicable) */}
            {selectedBand.filterType !== 'lowcut' && selectedBand.filterType !== 'highcut' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Gain</span>
                <input
                  type="range"
                  min={-18}
                  max={18}
                  step={0.1}
                  value={selectedBand.gainDb}
                  onChange={(e) => updateSelectedBand({ gainDb: parseFloat(e.target.value) })}
                  className="w-16 h-1 bg-slate-800 rounded appearance-none accent-cyan-400"
                />
                <span className="text-xs font-mono font-bold text-slate-200 tabular-nums min-w-[45px]">
                  {selectedBand.gainDb > 0 ? `+${selectedBand.gainDb}` : selectedBand.gainDb}dB
                </span>
              </div>
            )}

            {/* Q factor */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Q</span>
              <input
                type="range"
                min={0.1}
                max={18}
                step={0.1}
                value={selectedBand.q}
                onChange={(e) => updateSelectedBand({ q: parseFloat(e.target.value) })}
                className="w-14 h-1 bg-slate-800 rounded appearance-none accent-cyan-400"
              />
              <span className="text-xs font-mono font-bold text-slate-300 tabular-nums min-w-[32px]">
                {selectedBand.q}
              </span>
            </div>

            {/* Dynamic EQ Toggle & Range */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/80">
              <button
                type="button"
                onClick={() => updateSelectedBand({ dynamic: !selectedBand.dynamic })}
                className={`px-2 py-0.5 text-xs font-mono font-bold rounded border transition-colors ${
                  selectedBand.dynamic
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
              >
                Dynamic EQ
              </button>

              {selectedBand.dynamic && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-amber-400">Rng:</span>
                  <input
                    type="range"
                    min={-18}
                    max={18}
                    step={0.5}
                    value={selectedBand.dynamicRangeDb}
                    onChange={(e) => updateSelectedBand({ dynamicRangeDb: parseFloat(e.target.value) })}
                    className="w-12 h-1 bg-slate-800 rounded appearance-none accent-amber-400"
                  />
                  <span className="text-[10px] font-mono text-amber-300 tabular-nums">
                    {selectedBand.dynamicRangeDb > 0 ? `+${selectedBand.dynamicRangeDb}` : selectedBand.dynamicRangeDb}dB
                  </span>
                </div>
              )}
            </div>

            {/* Delete Band button */}
            <button
              type="button"
              onClick={deleteSelectedBand}
              disabled={settings.bands.length <= 1}
              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Delete band"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
