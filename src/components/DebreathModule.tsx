import React from 'react';
import { DebreathSettings } from '../types/audio';
import { Wind, VolumeX, Sliders } from 'lucide-react';

interface DebreathModuleProps {
  settings: DebreathSettings;
  onChange: (newSettings: DebreathSettings) => void;
}

export const DebreathModule: React.FC<DebreathModuleProps> = ({ settings, onChange }) => {
  return (
    <div
      className={`rounded-xl border transition-all p-4 ${
        settings.enabled
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
                AIR-X
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Vocal Debreath Engine
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Isolates and attenuates breath inhalations between phrases while preserving vocal attacks
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>

      <div className="pt-3 space-y-3">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300">Reduction Strategy</span>
          <div className="flex items-center gap-1 bg-[#090d16] border border-slate-800 p-0.5 rounded">
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => onChange({ ...settings, mode: 'attenuate' })}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                settings.mode === 'attenuate'
                  ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Attenuate (Natural)
            </button>
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => onChange({ ...settings, mode: 'mute' })}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                settings.mode === 'mute'
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Total Gate (Mute)
            </button>
          </div>
        </div>

        {/* Reduction Amount (if attenuate) */}
        {settings.mode === 'attenuate' && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Breath Reduction Depth</span>
              <span className="font-mono tabular-nums text-cyan-400">-{settings.reductionDb} dB</span>
            </div>
            <input
              type="range"
              min={6}
              max={36}
              step={1}
              disabled={!settings.enabled}
              value={settings.reductionDb}
              onChange={(e) => onChange({ ...settings, reductionDb: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Sensitivity</span>
              <span className="font-mono tabular-nums text-slate-300">{settings.sensitivity} / 10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              disabled={!settings.enabled}
              value={settings.sensitivity}
              onChange={(e) => onChange({ ...settings, sensitivity: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Onset Transition</span>
              <span className="font-mono tabular-nums text-slate-300">{settings.smoothOnsetMs} ms</span>
            </div>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              disabled={!settings.enabled}
              value={settings.smoothOnsetMs}
              onChange={(e) => onChange({ ...settings, smoothOnsetMs: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
