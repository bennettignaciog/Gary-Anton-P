import React from 'react';
import { ModuleSettings } from '../types/audio';
import { ParametricEqFabFilter } from './ParametricEqFabFilter';
import { DebreathModule } from './DebreathModule';
import {
  Sliders,
  Sparkles,
  Zap,
  Mic,
  Users,
  ShieldAlert,
  Disc,
  RotateCcw,
  RefreshCw,
  Undo2,
  Redo2,
  Database,
  History,
} from 'lucide-react';

interface ModuleRackProps {
  settings: ModuleSettings;
  onSettingsChange: (newSettings: ModuleSettings) => void;
  onApply: () => void;
  isProcessing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  historyLength: number;
  onOpenHistory: () => void;
}

export const ModuleRack: React.FC<ModuleRackProps> = ({
  settings,
  onSettingsChange,
  onApply,
  isProcessing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyLength,
  onOpenHistory,
}) => {
  // Preset handler
  const applyPreset = (presetName: string) => {
    const updated: ModuleSettings = JSON.parse(JSON.stringify(settings));

    if (presetName === '90s-lead-polish') {
      updated.leadLeveler.enabled = true;
      updated.leadLeveler.targetRmsDb = -18;
      updated.leadLeveler.speed = 'natural';
      updated.leadLeveler.preserveVocalDynamics = true;

      updated.backgroundLeveler.enabled = false;
      updated.declip.enabled = true;
      updated.mouthDeclick.enabled = true;
      updated.deplosive.enabled = true;
      updated.debreath.enabled = true;
      updated.debreath.mode = 'attenuate';
      updated.debreath.reductionDb = 14;

      // FabFilter style vocal EQ curve: low cut, body clean, air boost
      updated.parametricEq.enabled = true;
      updated.parametricEq.linearPhase = true;
      updated.parametricEq.bands = [
        { id: 'b1', enabled: true, filterType: 'lowcut', freqHz: 80, gainDb: 0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#06b6d4' },
        { id: 'b2', enabled: true, filterType: 'bell', freqHz: 280, gainDb: -2.5, q: 1.8, dynamic: true, dynamicRangeDb: -3.0, thresholdDb: -16, color: '#f59e0b' },
        { id: 'b3', enabled: true, filterType: 'bell', freqHz: 3200, gainDb: +2.5, q: 1.4, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#ec4899' },
        { id: 'b4', enabled: true, filterType: 'bell', freqHz: 6500, gainDb: -1.5, q: 2.5, dynamic: true, dynamicRangeDb: -4.0, thresholdDb: -14, color: '#10b981' },
        { id: 'b5', enabled: true, filterType: 'highshelf', freqHz: 11000, gainDb: +3.0, q: 0.9, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#8b5cf6' },
      ];
    } else if (presetName === 'podcast-clean') {
      updated.leadLeveler.enabled = true;
      updated.leadLeveler.targetRmsDb = -16;
      updated.leadLeveler.speed = 'tight';
      updated.backgroundLeveler.enabled = false;
      updated.deplosive.enabled = true;
      updated.deplosive.cutoffHz = 125;
      updated.mouthDeclick.enabled = true;
      updated.debreath.enabled = true;
      updated.debreath.mode = 'attenuate';
      updated.debreath.reductionDb = 20;
      updated.declick.enabled = true;

      updated.parametricEq.enabled = true;
      updated.parametricEq.linearPhase = true;
      updated.parametricEq.bands = [
        { id: 'b1', enabled: true, filterType: 'lowcut', freqHz: 95, gainDb: 0, q: 0.8, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#06b6d4' },
        { id: 'b2', enabled: true, filterType: 'bell', freqHz: 240, gainDb: -2.0, q: 2.0, dynamic: true, dynamicRangeDb: -3.0, thresholdDb: -16, color: '#f59e0b' },
        { id: 'b3', enabled: true, filterType: 'bell', freqHz: 2800, gainDb: +2.0, q: 1.2, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#ec4899' },
        { id: 'b4', enabled: true, filterType: 'notch', freqHz: 4000, gainDb: -3.0, q: 3.5, dynamic: true, dynamicRangeDb: -4.0, thresholdDb: -15, color: '#10b981' },
        { id: 'b5', enabled: true, filterType: 'highcut', freqHz: 17500, gainDb: 0, q: 0.7, dynamic: false, dynamicRangeDb: 0, thresholdDb: -18, color: '#8b5cf6' },
      ];
    } else if (presetName === 'vintage-declip') {
      updated.declip.enabled = true;
      updated.declip.thresholdDb = -1.0;
      updated.declip.headroomExpansionDb = 2.0;
      updated.declick.enabled = true;
      updated.decrackle.enabled = true;
      updated.decrackle.intensity = 5;
    } else if (presetName === 'flat-bypass') {
      updated.leadLeveler.enabled = false;
      updated.backgroundLeveler.enabled = false;
      updated.declip.enabled = false;
      updated.declick.enabled = false;
      updated.decrackle.enabled = false;
      updated.mouthDeclick.enabled = false;
      updated.deplosive.enabled = false;
      updated.debreath.enabled = false;
      updated.parametricEq.enabled = false;
    }

    onSettingsChange(updated);
  };

  const updateSub = <K extends keyof ModuleSettings>(
    moduleKey: K,
    patch: Partial<ModuleSettings[K]>
  ) => {
    const updated = {
      ...settings,
      [moduleKey]: {
        ...settings[moduleKey],
        ...patch,
      },
    };
    onSettingsChange(updated);
  };

  return (
    <div id="modules" className="space-y-4">
      {/* 90s Rack Control Header with Undo/Redo & Cloud History */}
      <div className="rack-chassis rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Rack mount screw */}
          <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-[10px] font-mono text-slate-300 select-none shadow-sm">
            +
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-widest text-cyan-400 font-mono">
                VOXRACK DSP-2400
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                90s ANALOG-DIGITAL HYBRID
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              10-Band Linear Phase Dynamic EQ, Debreath, Spline Declip & Vocal Leveling
            </p>
          </div>
        </div>

        {/* Toolbar: Undo, Redo, Cloud Memory, Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo Stack */}
          <div className="flex items-center gap-1 bg-[#090d16] border border-slate-700/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo parameter change (Ctrl+Z)"
              className="px-2.5 py-1 text-xs font-mono font-medium rounded flex items-center gap-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo{historyLength > 0 ? ` (${historyLength})` : ''}</span>
            </button>
            <div className="w-[1px] h-3.5 bg-slate-700" />
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo parameter change (Ctrl+Y)"
              className="px-2.5 py-1 text-xs font-mono font-medium rounded flex items-center gap-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>Redo</span>
            </button>
          </div>

          {/* Cloud Memory Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud History & Presets</span>
          </button>

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyPreset('90s-lead-polish')}
              className="px-2 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
            >
              90s Polish
            </button>
            <button
              type="button"
              onClick={() => applyPreset('podcast-clean')}
              className="px-2 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
            >
              Podcast VO
            </button>
            <button
              type="button"
              onClick={() => applyPreset('flat-bypass')}
              title="Bypass all modules"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* FabFilter Pro-Q style Visual Parametric Equalizer Module */}
      <ParametricEqFabFilter
        settings={settings.parametricEq}
        onChange={(newEq) => onSettingsChange({ ...settings, parametricEq: newEq })}
      />

      {/* Debreath & Declip Dual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Debreath Module (NEW) */}
        <DebreathModule
          settings={settings.debreath}
          onChange={(newDebreath) => onSettingsChange({ ...settings, debreath: newDebreath })}
        />

        {/* Declip Module */}
        <div
          className={`rounded-xl border transition-all p-4 ${
            settings.declip.enabled
              ? 'rack-chassis border-amber-500/40 shadow-xl shadow-amber-950/20'
              : 'bg-[#0f141f] border-slate-800/80 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-400 select-none">
                +
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest text-amber-400 font-mono">
                    PEAK-REC
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Declip Spline Restorer
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">Reconstructs flattened peaks and digital preamp saturation</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.declip.enabled}
                onChange={(e) => updateSub('declip', { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="pt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Clipping Detection Threshold</span>
                <span className="font-mono tabular-nums text-amber-400">{settings.declip.thresholdDb} dBFS</span>
              </div>
              <input
                type="range"
                min={-3.0}
                max={-0.1}
                step={0.1}
                disabled={!settings.declip.enabled}
                value={settings.declip.thresholdDb}
                onChange={(e) => updateSub('declip', { thresholdDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-40"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Headroom Expansion Safety Margin</span>
                <span className="font-mono tabular-nums text-slate-300">+{settings.declip.headroomExpansionDb} dB</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                disabled={!settings.declip.enabled}
                value={settings.declip.headroomExpansionDb}
                onChange={(e) => updateSub('declip', { headroomExpansionDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vocal Leveling Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1: Lead Vocal Leveler */}
        <div
          className={`rounded-xl border transition-all p-4 ${
            settings.leadLeveler.enabled
              ? 'rack-chassis border-cyan-500/40 shadow-xl shadow-cyan-950/20'
              : 'bg-[#0f141f] border-slate-800/80 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-400 select-none">
                +
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest text-cyan-400 font-mono">
                    LEVEL-1
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Lead Vocal Leveler
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">Intelligent gain automation without compression pumping</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.leadLeveler.enabled}
                onChange={(e) => {
                  updateSub('leadLeveler', { enabled: e.target.checked });
                  if (e.target.checked) updateSub('backgroundLeveler', { enabled: false });
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="pt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Target Vocal Body Consistency</span>
                <span className="font-mono tabular-nums text-cyan-400">{settings.leadLeveler.targetRmsDb} dBFS</span>
              </div>
              <input
                type="range"
                min={-28}
                max={-12}
                step={0.5}
                disabled={!settings.leadLeveler.enabled}
                value={settings.leadLeveler.targetRmsDb}
                onChange={(e) => updateSub('leadLeveler', { targetRmsDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
              />
            </div>

            {/* Ballistics Speed Profile */}
            <div>
              <span className="text-xs text-slate-400 block mb-1">Response Ballistics</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['tight', 'natural', 'transparent'] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    disabled={!settings.leadLeveler.enabled}
                    onClick={() => updateSub('leadLeveler', { speed: spd })}
                    className={`py-1 text-xs font-mono rounded capitalize transition-colors ${
                      settings.leadLeveler.speed === spd
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                        : 'bg-[#080c14] text-slate-400 border border-slate-800 hover:text-white'
                    } disabled:opacity-40`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>

            {/* Preserve Dynamics toggle */}
            <div className="flex items-center justify-between bg-[#080c14] border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
              <div>
                <span className="text-xs text-slate-300 block">Natural Dynamics</span>
                <span className="text-[10px] text-slate-500">Soft-knee curve preserves emotional intent</span>
              </div>
              <input
                type="checkbox"
                disabled={!settings.leadLeveler.enabled}
                checked={settings.leadLeveler.preserveVocalDynamics}
                onChange={(e) => updateSub('leadLeveler', { preserveVocalDynamics: e.target.checked })}
                className="accent-cyan-400 cursor-pointer disabled:opacity-40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Max Boost</span>
                <div className="flex items-center justify-between bg-[#080c14] border border-slate-800 px-2 py-1 rounded">
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    disabled={!settings.leadLeveler.enabled}
                    value={settings.leadLeveler.maxBoostDb}
                    onChange={(e) => updateSub('leadLeveler', { maxBoostDb: parseFloat(e.target.value) })}
                    className="w-16 h-1 bg-slate-800 rounded appearance-none accent-cyan-400 disabled:opacity-40"
                  />
                  <span className="text-xs font-mono tabular-nums text-slate-300">+{settings.leadLeveler.maxBoostDb}dB</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Max Cut</span>
                <div className="flex items-center justify-between bg-[#080c14] border border-slate-800 px-2 py-1 rounded">
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    disabled={!settings.leadLeveler.enabled}
                    value={settings.leadLeveler.maxCutDb}
                    onChange={(e) => updateSub('leadLeveler', { maxCutDb: parseFloat(e.target.value) })}
                    className="w-16 h-1 bg-slate-800 rounded appearance-none accent-cyan-400 disabled:opacity-40"
                  />
                  <span className="text-xs font-mono tabular-nums text-slate-300">-{settings.leadLeveler.maxCutDb}dB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Background Vocal Leveler */}
        <div
          className={`rounded-xl border transition-all p-4 ${
            settings.backgroundLeveler.enabled
              ? 'rack-chassis border-cyan-500/40 shadow-xl shadow-cyan-950/20'
              : 'bg-[#0f141f] border-slate-800/80 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-400 select-none">
                +
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest text-cyan-400 font-mono">
                    STACK-2
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Background Leveler
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">Balance harmonies, doubles, and ad-libs behind the lead</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.backgroundLeveler.enabled}
                onChange={(e) => {
                  updateSub('backgroundLeveler', { enabled: e.target.checked });
                  if (e.target.checked) updateSub('leadLeveler', { enabled: false });
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="pt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Support Level (Target RMS)</span>
                <span className="font-mono tabular-nums text-cyan-400">{settings.backgroundLeveler.targetRmsDb} dBFS</span>
              </div>
              <input
                type="range"
                min={-32}
                max={-16}
                step={0.5}
                disabled={!settings.backgroundLeveler.enabled}
                value={settings.backgroundLeveler.targetRmsDb}
                onChange={(e) => updateSub('backgroundLeveler', { targetRmsDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Harmony Spread Balance</span>
                <span className="font-mono tabular-nums text-slate-300">{Math.round(settings.backgroundLeveler.balanceRatio * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                disabled={!settings.backgroundLeveler.enabled}
                value={settings.backgroundLeveler.balanceRatio}
                onChange={(e) => updateSub('backgroundLeveler', { balanceRatio: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
              />
            </div>

            {/* Harmony Ducking toggle */}
            <div className="flex items-center justify-between bg-[#080c14] border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
              <div>
                <span className="text-xs text-slate-300 block">Lead Priority Ducking</span>
                <span className="text-[10px] text-slate-500">Ducks background when lead vocal is present</span>
              </div>
              <input
                type="checkbox"
                disabled={!settings.backgroundLeveler.enabled}
                checked={settings.backgroundLeveler.harmonyDucking}
                onChange={(e) => updateSub('backgroundLeveler', { harmonyDucking: e.target.checked })}
                className="accent-cyan-400 cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Repair Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mouth Declick */}
        <div
          className={`rounded-xl border transition-all p-3.5 ${
            settings.mouthDeclick.enabled
              ? 'rack-chassis border-cyan-500/40 shadow-lg'
              : 'bg-[#0f141f] border-slate-800/80 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
            <h4 className="text-xs font-bold text-white font-mono">MOUTH DECLICK</h4>
            <input
              type="checkbox"
              checked={settings.mouthDeclick.enabled}
              onChange={(e) => updateSub('mouthDeclick', { enabled: e.target.checked })}
              className="accent-cyan-500 cursor-pointer"
            />
          </div>
          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Sensitivity</span>
              <span className="font-mono text-cyan-400">{settings.mouthDeclick.sensitivity}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              disabled={!settings.mouthDeclick.enabled}
              value={settings.mouthDeclick.sensitivity}
              onChange={(e) => updateSub('mouthDeclick', { sensitivity: parseInt(e.target.value) })}
              className="w-full h-1 bg-slate-800 rounded appearance-none accent-cyan-400"
            />
          </div>
        </div>

        {/* Deplosive */}
        <div
          className={`rounded-xl border transition-all p-3.5 ${
            settings.deplosive.enabled
              ? 'rack-chassis border-amber-500/40 shadow-lg'
              : 'bg-[#0f141f] border-slate-800/80 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
            <h4 className="text-xs font-bold text-white font-mono">DEPLOSIVE POP</h4>
            <input
              type="checkbox"
              checked={settings.deplosive.enabled}
              onChange={(e) => updateSub('deplosive', { enabled: e.target.checked })}
              className="accent-amber-500 cursor-pointer"
            />
          </div>
          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Cutoff</span>
              <span className="font-mono text-amber-400">{settings.deplosive.cutoffHz} Hz</span>
            </div>
            <input
              type="range"
              min={80}
              max={150}
              step={5}
              disabled={!settings.deplosive.enabled}
              value={settings.deplosive.cutoffHz}
              onChange={(e) => updateSub('deplosive', { cutoffHz: parseInt(e.target.value) })}
              className="w-full h-1 bg-slate-800 rounded appearance-none accent-amber-400"
            />
          </div>
        </div>

        {/* Declick & Decrackle */}
        <div
          className={`rounded-xl border transition-all p-3.5 ${
            settings.declick.enabled || settings.decrackle.enabled
              ? 'rack-chassis border-cyan-500/40 shadow-lg'
              : 'bg-[#0f141f] border-slate-800/80 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
            <h4 className="text-xs font-bold text-white font-mono">DECLICK / CRACKLE</h4>
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={settings.declick.enabled}
                onChange={(e) => updateSub('declick', { enabled: e.target.checked })}
                className="accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Sensitivity</span>
              <span className="font-mono text-cyan-400">{settings.declick.sensitivity}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              disabled={!settings.declick.enabled}
              value={settings.declick.sensitivity}
              onChange={(e) => updateSub('declick', { sensitivity: parseInt(e.target.value) })}
              className="w-full h-1 bg-slate-800 rounded appearance-none accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={onApply}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-950/50 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'Computing DSP...' : 'Execute DSP Rack'}</span>
        </button>
      </div>
    </div>
  );
};
