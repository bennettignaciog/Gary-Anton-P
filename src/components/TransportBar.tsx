import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Repeat, Radio, Gauge } from 'lucide-react';
import { MonitorMode } from '../types/audio';
import { audioPlayer } from '../audio/audioPlayer';
import { AnalogVuMeter } from './AnalogVuMeter';

interface TransportBarProps {
  monitorMode: MonitorMode;
  onMonitorModeChange: (mode: MonitorMode) => void;
  hasAudio: boolean;
  isProcessing: boolean;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  monitorMode,
  onMonitorModeChange,
  hasAudio,
  isProcessing,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isLooping, setIsLooping] = useState(true);

  // Real-time Dual Analog VU meter levels
  const [vuLevels, setVuLevels] = useState<{
    inputRmsDb: number;
    inputPeakDb: number;
    outputRmsDb: number;
    outputPeakDb: number;
  }>({
    inputRmsDb: -60,
    inputPeakDb: -60,
    outputRmsDb: -60,
    outputPeakDb: -60,
  });

  const meterAnimRef = useRef<number | null>(null);

  useEffect(() => {
    audioPlayer.setLoop(isLooping);
    audioPlayer.setVolume(volume);

    const unsubscribe = audioPlayer.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 60fps Real-time RMS & Peak polling for Dual Analog VU Meters
  useEffect(() => {
    const updateVu = () => {
      if (isPlaying) {
        const live = audioPlayer.getLiveVuLevels();
        setVuLevels(live);
      } else {
        setVuLevels((prev) => ({
          inputRmsDb: Math.max(-60, prev.inputRmsDb - 2.5),
          inputPeakDb: Math.max(-60, prev.inputPeakDb - 2.5),
          outputRmsDb: Math.max(-60, prev.outputRmsDb - 2.5),
          outputPeakDb: Math.max(-60, prev.outputPeakDb - 2.5),
        }));
      }
      meterAnimRef.current = requestAnimationFrame(updateVu);
    };

    meterAnimRef.current = requestAnimationFrame(updateVu);
    return () => {
      if (meterAnimRef.current !== null) {
        cancelAnimationFrame(meterAnimRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!hasAudio || isProcessing) return;
    if (isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioPlayer.seek(val);
  };

  const handleRestart = () => {
    audioPlayer.seek(0);
  };

  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    audioPlayer.setLoop(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioPlayer.setVolume(val);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rack-chassis rounded-xl p-4 space-y-4">
      {/* Upper Deck: Dual Analog-Style VU Meter Console */}
      <div className="bg-[#0b0f17] border border-slate-700/80 rounded-lg p-3 shadow-inner flex flex-col md:flex-row items-center justify-between gap-4">
        {/* VU Console Info Badge */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-[10px] font-mono text-slate-300 select-none shadow-sm">
            +
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                Dual Analog VU Ballistics
              </span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-700/60 px-1.5 py-0.5 rounded">
                0 VU = -14 dBFS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live incandescent back-lit scales with d'Arsonval spring damping & peak warning LEDs
            </p>
          </div>
        </div>

        {/* Dual Analog Meters: INPUT & OUTPUT */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 w-full md:w-auto">
          {/* 1. Input Analog VU Meter */}
          <AnalogVuMeter
            label="INPUT"
            subLabel="DRY RAW"
            rmsDb={vuLevels.inputRmsDb}
            peakDb={vuLevels.inputPeakDb}
            isPlaying={isPlaying}
          />

          {/* 2. Output Analog VU Meter */}
          <AnalogVuMeter
            label="OUTPUT"
            subLabel={monitorMode === 'processed' ? 'PROCESSED' : monitorMode === 'delta' ? 'DELTA NOISE' : 'RAW'}
            rmsDb={vuLevels.outputRmsDb}
            peakDb={vuLevels.outputPeakDb}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {/* Lower Deck: Hardware Transport Bar & Monitor Switcher */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-1">
        {/* Playback Controls & Timecode */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              disabled={!hasAudio}
              title="Return to Zero (Start)"
              className="p-2 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!hasAudio || isProcessing}
              title={isPlaying ? 'Pause' : 'Play'}
              className={`px-4 py-2 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                isPlaying
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md shadow-cyan-950/50'
              } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play Tape</span>
                </>
              )}
            </button>

            <button
              onClick={toggleLoop}
              title={isLooping ? 'Tape loop active' : 'Tape loop off'}
              className={`p-2 rounded border transition-colors ${
                isLooping
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          <div className="font-mono tabular-nums text-xs sm:text-sm bg-[#06090f] border border-slate-700 px-3 py-1.5 rounded flex items-center gap-1.5 text-slate-300">
            <span className="text-cyan-400 font-bold font-vfd">{formatTime(currentTime)}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-vfd">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="w-full flex-1 px-2">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              disabled={!hasAudio}
              className="w-full h-2 bg-slate-900 border border-slate-700 rounded appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Seamless A/B / Delta Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#06090f] border border-slate-700/80 rounded shrink-0">
          <button
            onClick={() => onMonitorModeChange('processed')}
            className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-all whitespace-nowrap ${
              monitorMode === 'processed'
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Processed (Clean)
          </button>
          <button
            onClick={() => onMonitorModeChange('original')}
            className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-all whitespace-nowrap ${
              monitorMode === 'original'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Original (Raw)
          </button>
          <button
            onClick={() => onMonitorModeChange('delta')}
            title="Listen only to removed artifacts & distortion"
            className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-all whitespace-nowrap flex items-center gap-1.5 ${
              monitorMode === 'delta'
                ? 'bg-purple-500 text-white shadow-sm shadow-purple-950/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Delta (Noise)</span>
          </button>
        </div>

        {/* Volume Fader */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={() => {
              const nextVol = volume > 0 ? 0 : 0.85;
              setVolume(nextVol);
              audioPlayer.setVolume(nextVol);
            }}
            className="text-slate-400 hover:text-slate-200"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 bg-slate-900 border border-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
    </div>
  );
};
