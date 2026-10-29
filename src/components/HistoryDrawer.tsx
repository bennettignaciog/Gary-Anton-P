import React, { useState, useEffect } from 'react';
import {
  HistoryRecord,
  PresetRecord,
  loadHistoryFromFirestore,
  deleteHistoryFromFirestore,
  savePresetToFirestore,
  loadPresetsFromFirestore,
} from '../db/historyService';
import { ModuleSettings } from '../types/audio';
import {
  History,
  Bookmark,
  RotateCcw,
  Trash2,
  Plus,
  X,
  Check,
  Clock,
  Sparkles,
  Database,
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRecallSettings: (settings: ModuleSettings, title: string) => void;
  currentSettings: ModuleSettings;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onRecallSettings,
  currentSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'presets'>('history');
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [presetsList, setPresetsList] = useState<PresetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Preset creation
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [hist, pres] = await Promise.all([
        loadHistoryFromFirestore(),
        loadPresetsFromFirestore(),
      ]);
      setHistoryList(hist);
      setPresetsList(pres);
    } catch (err) {
      console.warn('Failed to load history from cloud:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteHistoryFromFirestore(id);
      setHistoryList((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    setIsSavingPreset(true);
    const newPreset: PresetRecord = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      description: 'Custom user rack configuration',
      createdAt: new Date().toISOString(),
      settings: currentSettings,
    };

    try {
      await savePresetToFirestore(newPreset);
      setPresetsList((prev) => [newPreset, ...prev]);
      setNewPresetName('');
    } catch (err) {
      console.error('Failed to save preset', err);
    } finally {
      setIsSavingPreset(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-[#0d121c] border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header with 90s Rack Styling */}
        <div className="p-4 bg-[#141b27] border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono tracking-wider text-white uppercase">
              Cloud Memory & History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0a0e17]">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Process History ({historyList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Presets ({presetsList.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono">
              Loading records from Firestore...
            </div>
          ) : activeTab === 'history' ? (
            historyList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2 font-mono">
                <p>No history records saved yet.</p>
                <p className="text-[11px] text-slate-600">
                  Processing audio tracks automatically creates historical snapshots in Firebase.
                </p>
              </div>
            ) : (
              historyList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onRecallSettings(item.settings, item.fileName)}
                  className="p-3 rounded-lg bg-[#111724] border border-slate-800 hover:border-cyan-500/60 transition-all cursor-pointer group space-y-2 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[240px]">
                      {item.fileName}
                    </span>
                    <button
                      onClick={(e) => handleDeleteHistory(item.id, e)}
                      title="Delete record"
                      className="text-slate-500 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>{item.sampleRate.toLocaleString()} Hz</span>
                    <span>·</span>
                    <span>{item.bitDepth}-bit</span>
                    <span>·</span>
                    <span className="text-slate-500">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {item.statsSummary && (
                    <div className="text-[11px] font-mono text-cyan-400/90 bg-[#080c14] px-2 py-1 rounded border border-slate-800/80">
                      {item.statsSummary}
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[11px] text-cyan-400 group-hover:underline">
                    <span>Click to Recall Rack Parameters</span>
                    <RotateCcw className="w-3 h-3" />
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="space-y-4">
              {/* Save New Preset Form */}
              <form onSubmit={handleSavePreset} className="p-3 rounded-lg bg-[#111724] border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white block">Save Current Rack Settings</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Preset name (e.g. 90s Lead Polish)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#090d16] border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSavingPreset || !newPresetName.trim()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-all disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </form>

              {/* Presets List */}
              {presetsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  No custom presets saved. Save your current rack settings above!
                </div>
              ) : (
                presetsList.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => onRecallSettings(preset.settings, preset.name)}
                    className="p-3 rounded-lg bg-[#111724] border border-slate-800 hover:border-amber-500/60 transition-all cursor-pointer group space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{preset.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(preset.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{preset.description}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-amber-400 group-hover:underline">
                      <span>Recall Preset</span>
                      <Bookmark className="w-3 h-3" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
