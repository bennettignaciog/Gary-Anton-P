import React from 'react';
import {
  Mic,
  Users,
  Heart,
  Zap,
  Disc,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  FileCheck,
  Cpu,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

interface AudioInfoSectionProps {
  onScrollToTop: () => void;
}

export const AudioInfoSection: React.FC<AudioInfoSectionProps> = ({ onScrollToTop }) => {
  return (
    <div className="space-y-16 py-8 border-t border-slate-800/80">
      {/* 1. Vocal Leveling & Audio Repair Modules Grid */}
      <section id="features" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Precision Modules Built for Critical Vocal Tracks
          </h2>
          <p className="text-sm text-slate-400">
            Professional vocal repair shouldn't require complex desktop plugins or hours of manual volume automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vocal Leveling Suite */}
          <div className="bg-[#101726] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span>Vocal Leveling Engine</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400">Zero Compression Pumping</span>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Lead Vocal Leveling</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Intelligent gain automation smooths out volume differences between words and phrases, so your lead sits consistently in the mix without the pumping or artifacts of heavy compression.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Background Vocal Leveling</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Harmonies, doubles, and ad-libs are balanced independently, keeping them supportive and even behind the lead vocal without phase anomalies.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Natural Dynamic Preservation</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Gain moves are applied transparently using soft logarithmic curves, preserving the organic performance and emotion of the artist's take.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Repair Suite */}
          <div className="bg-[#101726] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Restoration & Repair Suite</span>
              </h3>
              <span className="text-xs font-mono text-amber-400">Non-Destructive Spline DSP</span>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Declip</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Reconstructs peaks flattened by digital clipping, restoring natural waveform shape and reducing harsh digital distortion.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Disc className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Declick & Decrackle</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Detects and removes digital clicks, pops, and short transient glitches, while smoothing continuous preamp hiss and vinyl crackle.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Vocal Mouth Declick</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Targets lip smacks, saliva clicks, and mouth noises common in close-mic'd vocal condenser recordings, without dulling the voice.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Deplosive</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Tames low-frequency bursts from "p" and "b" sounds while keeping the chest resonance and warmth of the vocal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How It Works (4 Steps) */}
      <section id="workflow" className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            How It Works
          </h2>
          <p className="text-sm text-slate-400">
            Four simple steps from raw, flawed take to mix-ready vocal master.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#101726] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-slate-800/80 font-mono absolute top-3 right-4 select-none">
              01
            </span>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-3">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">1. Upload Audio</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Drop your 24-bit WAV, FLAC, AIFF, or MP3 file. The engine checks sample rate and bit depth automatically.
            </p>
          </div>

          <div className="bg-[#101726] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-slate-800/80 font-mono absolute top-3 right-4 select-none">
              02
            </span>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">2. Select Modules</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Enable the restoration and leveling algorithms you need, then fine-tune intensity, threshold, and target RMS.
            </p>
          </div>

          <div className="bg-[#101726] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-slate-800/80 font-mono absolute top-3 right-4 select-none">
              03
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">3. Audition & Delta</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Preview before and after with instantaneous A/B switching. Switch to Delta mode to hear exactly what was removed.
            </p>
          </div>

          <div className="bg-[#101726] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <span className="text-3xl font-extrabold text-slate-800/80 font-mono absolute top-3 right-4 select-none">
              04
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">4. Download 24-bit</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Download your file in its original format and quality, with no loss, zero downsampling, and no watermark.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Why Choose Us & 24-Bit Specs */}
      <section id="specs" className="bg-[#101726] border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Why Studio Engineers Trust VOXRACK
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Built specifically for vocalists, podcasters, mixing engineers, and audio restoration specialists.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Bit-Exact 24-Bit Linear PCM</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-200">Full 24-bit Native Processing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audio is decoded into 64/32-bit floating point buffers and serialized back to 24-bit fixed-point PCM. Enjoy 144 dB of dynamic range without truncation noise.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-200">Preserved Sample Rates</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your audio remains at 44.1 kHz, 48 kHz, 96 kHz, or 192 kHz. We never resample or downsample your takes upon export.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-200">Zero Software to Install</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Runs in any modern browser on macOS, Windows, Linux, or iPadOS. No dongles, iLok licenses, or heavyweight DAWs required.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-200">Complete Privacy & Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All DSP algorithms run strictly in your browser's local memory. Your client stems and unreleased music never touch a cloud server.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-200">Instant A/B Delta Auditioning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Isolate and hear strictly the removed artifacts (Delta Mode) to verify that vocal warmth, transients, and air remain 100% intact.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-200">DAW-Ready Stem Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop the exported 24-bit WAV file straight into Pro Tools, Logic Pro, Ableton Live, FL Studio, or Reaper with phase alignment preserved.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Supported Formats Table */}
      <section id="formats" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">
            Supported Input & Export Specifications
          </h2>
          <span className="text-xs text-slate-400 font-mono">Format Integrity Matrix</span>
        </div>

        <div className="overflow-x-auto bg-[#101726] border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19] border-b border-slate-800 text-slate-400 font-medium font-mono">
              <tr>
                <th className="py-3 px-4">Container Format</th>
                <th className="py-3 px-4">Input Resolution</th>
                <th className="py-3 px-4">Sample Rate Support</th>
                <th className="py-3 px-4">Export Delivery Format</th>
                <th className="py-3 px-4">Quality Preservation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              <tr>
                <td className="py-3 px-4 font-semibold text-white">WAV (Broadcast Wave)</td>
                <td className="py-3 px-4">16, 24, 32-bit Float</td>
                <td className="py-3 px-4">44.1k to 192 kHz</td>
                <td className="py-3 px-4 text-cyan-400">24-bit PCM Linear WAV</td>
                <td className="py-3 px-4 text-emerald-400">100% Lossless</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">FLAC (Free Lossless)</td>
                <td className="py-3 px-4">16, 24-bit Lossless</td>
                <td className="py-3 px-4">44.1k to 96 kHz</td>
                <td className="py-3 px-4 text-cyan-400">24-bit PCM Linear WAV</td>
                <td className="py-3 px-4 text-emerald-400">100% Lossless</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">AIFF / AIFC</td>
                <td className="py-3 px-4">16, 24-bit PCM</td>
                <td className="py-3 px-4">44.1k to 192 kHz</td>
                <td className="py-3 px-4 text-cyan-400">24-bit PCM Linear WAV</td>
                <td className="py-3 px-4 text-emerald-400">100% Lossless</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">MP3 / AAC</td>
                <td className="py-3 px-4">Compressed VBR/CBR</td>
                <td className="py-3 px-4">44.1k, 48 kHz</td>
                <td className="py-3 px-4 text-cyan-400">24-bit PCM Linear WAV</td>
                <td className="py-3 px-4 text-slate-400">Decoded & Upgraded to 24-bit PCM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Call to Action Banner */}
      <section className="bg-gradient-to-r from-cyan-950/60 via-[#101726] to-amber-950/60 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Upload your first track and hear the difference.
        </h2>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          Repair clipping, eliminate saliva clicks, tame plosives, and balance your vocals with zero compression pumping.
        </p>
        <div className="pt-2">
          <button
            onClick={onScrollToTop}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-cyan-950/50 cursor-pointer transition-all active:scale-98"
          >
            <span>Open Workstation & Repair Stems</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400 font-mono">VOXRACK DSP-2400</span>
          <span>·</span>
          <span>90s Vintage Hardware Vocal Leveler & Audio Restoration Suite</span>
        </div>
        <div className="text-[11px] font-mono text-slate-600">
          Client-Side Web Audio DSP · Firebase Cloud Memory
        </div>
      </footer>
    </div>
  );
};
