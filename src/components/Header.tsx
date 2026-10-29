import React from 'react';
import { Sliders, Download, Database } from 'lucide-react';

interface HeaderProps {
  onExport: () => void;
  hasAudio: boolean;
  isProcessing: boolean;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onExport,
  hasAudio,
  isProcessing,
  onOpenHistory,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0d14]/95 backdrop-blur-md border-b border-slate-800/90 px-6 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark - VOXRACK */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-amber-500 flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-slate-700">
            <Sliders className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black tracking-widest text-white font-mono uppercase">
              VOXRACK
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">
              DSP-2400
            </span>
          </div>
        </div>

        {/* Zone 2: 4-5 clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono font-medium text-slate-400">
          <a href="#workstation" className="text-slate-200 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">
            WORKSTATION
          </a>
          <a href="#modules" className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0">
            10-BAND EQ & RACK
          </a>
          <a href="#workflow" className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0">
            HOW IT WORKS
          </a>
          <a href="#specs" className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0">
            24-BIT SPECS
          </a>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Memory</span>
          </button>

          <button
            onClick={onExport}
            disabled={!hasAudio || isProcessing}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all whitespace-nowrap shrink-0 ${
              hasAudio && !isProcessing
                ? 'bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 shadow-md shadow-cyan-950/60 cursor-pointer active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 24-Bit</span>
          </button>
        </div>
      </div>
    </header>
  );
};
