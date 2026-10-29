import React, { useRef } from 'react';
import { Upload, FileAudio, CheckCircle2, Download, ArrowRight, Play, Info } from 'lucide-react';
import { AudioFileMetadata } from '../types/audio';
import { DEMO_STEMS } from '../audio/demoSamples';

interface FileLoaderProps {
  onFileUpload: (file: File) => void;
  onSelectDemo: (stemId: string) => void;
  onExport: () => void;
  selectedDemoId: string | null;
  metadata: AudioFileMetadata | null;
  isProcessing: boolean;
}

export const FileLoader: React.FC<FileLoaderProps> = ({
  onFileUpload,
  onSelectDemo,
  onExport,
  selectedDemoId,
  metadata,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div id="workstation" className="space-y-4">
      {/* Upload Zone & Quick Stems Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Upload Box (5 cols) */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="lg:col-span-5 bg-[#101726] border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group shadow-lg shadow-black/20"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".wav,.aif,.aiff,.flac,.mp3,audio/*"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-105 group-hover:border-cyan-500/40 transition-all text-slate-400 group-hover:text-cyan-400 mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
            Upload 24-bit Audio Track
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Drag & drop WAV, FLAC, AIFF, or MP3. Studio files remain private and process 100% in your browser.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span>24-bit Native</span>
            <span>·</span>
            <span>Up to 192 kHz</span>
            <span>·</span>
            <span>Zero Watermarks</span>
          </div>
        </div>

        {/* Preloaded Flawed Takes (7 cols) */}
        <div className="lg:col-span-7 bg-[#101726] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-white tracking-wide">
                Audition Preloaded Flawed Vocal Takes
              </span>
              <span className="text-[11px] text-cyan-400">Instant One-Click Test</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              No files ready? Test our restoration DSP algorithms immediately on authentic vocal recordings with real clipping, plosives, and saliva mouth noise:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {DEMO_STEMS.map((stem) => {
              const isSelected = selectedDemoId === stem.id;
              return (
                <button
                  key={stem.id}
                  onClick={() => onSelectDemo(stem.id)}
                  disabled={isProcessing}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/40'
                      : 'bg-[#090d16] border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white truncate">{stem.name}</span>
                    <Play className={`w-3 h-3 ${isSelected ? 'text-cyan-400 fill-current' : 'text-slate-500'}`} />
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                    {stem.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[9px] font-mono text-amber-400/90">
                    <span>{stem.flaws[0]}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audio Format Integrity Card */}
      {metadata && (
        <div className="bg-[#0c1220] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate max-w-xs">{metadata.name}</span>
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                  {metadata.format}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                <span>{metadata.sampleRate.toLocaleString()} Hz</span>
                <span>·</span>
                <span>{metadata.numberOfChannels === 1 ? 'Mono' : 'Stereo'}</span>
                <span>·</span>
                <span>{metadata.bitDepth}-bit Input</span>
                <span>·</span>
                <span>Peak: {metadata.peakDbFS} dBFS</span>
              </div>
            </div>
          </div>

          {/* Export Guarantee Strip */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Lossless 24-bit Output
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Preserving {metadata.sampleRate.toLocaleString()} Hz with zero downsampling
              </span>
            </div>

            <button
              onClick={onExport}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 text-xs font-bold rounded-lg shadow-lg shadow-cyan-950/50 cursor-pointer transition-all active:scale-98 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Download 24-bit WAV</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
