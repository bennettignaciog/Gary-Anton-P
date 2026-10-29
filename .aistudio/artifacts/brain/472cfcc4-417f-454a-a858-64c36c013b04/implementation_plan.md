# AudioFix Studio: In-Browser Vocal Leveling & Restoration Suite

AudioFix Studio is a studio-grade, zero-install audio restoration and vocal leveling workstation running entirely inside the browser. It delivers transparent 24-bit PCM signal processing, real-time frequency and waveform visualizers, instant A/B difference monitoring, and bit-exact WAV export with zero quality loss or downsampling.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product and design decisions were confirmed during the interactive interview:
> - **Workstation Focus**: A full in-browser digital audio workstation (DAW) experience featuring real client-side DSP processing, live playback, interactive parameters, and lossless 24-bit export.
> - **Preloaded Audio Samples**: Bundled with 3 realistic, high-resolution vocal stems exhibiting specific flaws (digital clipping, harsh mouth smacks/clicks, and erratic vocal dynamics/plosives) so users can immediately audition before/after processing without needing their own files on hand.
> - **Visual Identity**: Dark pro-audio rack aesthetic inspired by modern hardware mastering units and high-end software DAWs, with amber and cyan spectrum visualizers, precision stereo peak/RMS meters, and tactile rotary/fader controls.

---

### 1. Overview & Core Concept

- **What It Does**: Allows audio engineers, podcasters, vocalists, and producers to drag-and-drop 16-bit, 24-bit, or 32-bit floating-point WAV/FLAC/MP3 files into their browser. Users can configure module racks for **Audio Repair** (Declip, Declick, Decrackle, Mouth Declick, Deplosive) and **Vocal Leveling** (Lead Vocal Leveler, Background Vocal Harmony Balancer, Natural Dynamic Smoothing), listen in real-time or render with high-precision offline DSP, toggle instant A/B comparisons with Delta (Difference) monitoring, and download lossless 24-bit broadcast-grade WAV files matching original sample rates.
- **Target Audience / Persona**:
  - Independent recording artists & vocalists needing quick polish for raw home-studio vocal takes.
  - Podcast editors and voiceover artists eliminating plosives, mouth noise, and room clicks.
  - Mixing and mastering engineers needing fast, artifact-free vocal leveling before compression.
- **Key Value**: Professional studio restoration without desktop installs, expensive subscription licenses, or uploading confidential studio audio to cloud servers.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Audio Ingestion / Demo Selection**:
   - The user lands on the DAW interface. A prominent drop zone allows uploading uncompressed audio (`.wav`, `.aif`, `.flac`, `.mp3`).
   - A single-click **"Load Demo Vocals"** selector allows loading one of three studio takes:
     - *Stem A: Clipped Rock Lead Vocal* (harsh digital clipping + dynamic spikes).
     - *Stem B: Intimate Spoken Voiceover / Podcast* (prominent saliva mouth clicks + heavy plosive pops).
     - *Stem C: Uneven Duet / Backing Harmonies* (erratic phrases needing leveling and background balance).
2. **Interactive Visualizer & Transport**:
   - Dual high-resolution visualizers: Dual-channel synchronized **Waveform Timeline** (with zoom, loop region, and playhead scrub) and **Real-Time FFT Spectrum Analyzer** (highlighting active frequency bands from 20 Hz to 20 kHz).
   - Audio transport controls: Play/Pause, Loop, Scrub, Volume, Master Output Peak/LUFS meter, and **A/B Switch** (Dry Input vs. Processed Output vs. Delta/Isolated Noise Removed).
3. **Module Rack Configuration**:
   - Arranged as a modular mastering rack with bypass switches, intensity knobs, and visual reduction meters for each algorithm:
     - **Vocal Leveler**: Mode selector (Lead Vocal vs. Background Harmony), Target Consistency, Speed (Fast/Transparent), Gate Threshold, Max Range (dB).
     - **Declip**: Peak reconstruction threshold (dBFS), Headroom expansion margin, Cubic spline interpolation.
     - **Declick & Decrackle**: Sensitivity fader, Transient burst size, High-frequency crackle threshold.
     - **Mouth Declick**: Asymmetric spectral click detector, Saliva smack frequency focus (2 kHz – 8 kHz).
     - **Deplosive**: Low-frequency boom threshold (<150 Hz), Transient sensitivity, Body warmth retention.
4. **Processing & Lossless Export**:
   - Instant real-time preview via Web Audio WebAssembly/DSP graph, plus an **Offline Render** mode for sample-accurate 64-bit float math rendered to a pristine 24-bit PCM WAV container.
   - Detailed format breakdown card showing Input format vs. Output format (Bit Depth: 24-bit, Sample Rate: e.g. 44.1kHz/48kHz/96kHz, Channels: Mono/Stereo).
   - Single-click lossless download.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-precision pro-audio rack gear (analog warmth meets digital precision). Deep matte slate surfaces, tactile brushed aluminum bezel outlines, precision amber LEDs, and cyan phosphor frequency glows.
- **Color Palette**:
  - Base canvas: `#0B0F17` (Deep graphite void)
  - Rack surface / module enclosures: `#121824` with `#1E293B` hairline borders
  - Active Cyan Accent: `#06B6D4` / `#22D3EE` (Frequency spectrum, high-frequency transients, lead vocal meters)
  - Warm Amber Accent: `#F59E0B` / `#FBBF24` (Gain reduction, peak limiters, declip indicators, active vacuum warmth)
  - Crimson Peak Alert: `#EF4444` (Clipping detection indicators, true-peak warnings)
  - Typography: `Outfit` / `Plus Jakarta Sans` for clean rack labels, paired with `JetBrains Mono` / `tabular-nums` for decibels, millisecond intervals, and sample counts.

#### Interactive Feedback & Motion
- Smooth 60fps canvas-based waveform and real-time spectrum visualizer that animates during playback.
- Interactive custom rotary knobs and precision faders with drag gestures, numerical keyboard input, and double-click reset.
- Live Gain Reduction meter showing transparent dynamic leveling in real-time.
- "Listen to Removed Noise (Delta Mode)" toggle: allows the engineer to hear *only* what the repair algorithms are taking away to verify zero voice degradation.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Pure Client-Side Web Audio DSP vs. Server Processing
- **Chosen Approach**: 100% in-browser processing using Web Audio API + specialized DSP processing workers in TypeScript/TypedArray algorithms.
- **Why**: Zero server latency, unlimited file sizes without cloud transfer costs, maximum user privacy (confidential audio never leaves the browser), and instant interactive playback feedback.
- **Trade-Off**: Uses client CPU for offline batch renders, but modern browsers process 30-second 24-bit vocal stems in ~300ms using typed array float32/float64 math.

#### Decision 2: True 24-bit PCM WAV Encoding
- **Chosen Approach**: Custom client-side WAV binary encoder that writes RIFF/WAVE 24-bit linear PCM (`audio/wav`) chunks directly from normalized 64-bit/32-bit audio buffers.
- **Why**: Standard browser `MediaRecorder` encodes lossy WebM/Opus. True mastering engineers require exact 24-bit lossless PCM matching original sample rates with no dither distortion or bit-depth reduction.

#### Decision 3: Realistic Algorithmic DSP Implementations
- **Declip**: Detects contiguous flat-top samples exceeding the clip threshold; applies Catmull-Rom / Hermite cubic interpolation to reconstruct missing dynamic peaks and scales headroom to prevent inter-sample clipping.
- **Declick & Decrackle**: Computes sample-to-sample derivative energy; identifies anomalous high-frequency impulse spikes (<2ms); performs predictive autoregressive (AR) interpolation over the detected glitch window.
- **Mouth Declick**: Band-passed detection (2.5 kHz – 7.5 kHz) targeting wet acoustic micro-transients typical of saliva pops while leaving sustained vocal sibilants untouched.
- **Deplosive**: Dynamic sub-150Hz energy envelope follower; attenuates transient low-frequency pressure blasts with adaptive high-pass filtering without thinning out vocal chest resonance.
- **Vocal Leveler**: Fast-RMS envelope follower with lookahead buffer; calculates deviation from the target leveling RMS; smoothly modulates gain using soft log curves to eliminate word-level volume drops.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AudioFix Studio (App)                           │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar: Title, Engine Status, Audio I/O Info, Reset, Export 24-bit  │
├──────────────────────────────────────┬─────────────────────────────────┤
│         Main Audio Viewport          │        Module Control Rack      │
│  ┌────────────────────────────────┐  │  ┌───────────────────────────┐  │
│  │ Dual Waveform Canvas Display   │  │  │ Module 1: Vocal Leveler   │  │
│  │ (Dry Waveform vs. Cleaned Wave)│  │  │ - Mode: Lead / Backing    │  │
│  ├────────────────────────────────┤  │  │ - Target, Speed, Max Range│  │
│  │ Real-Time FFT Spectrum Analyzer│  │  ├───────────────────────────┤  │
│  │ (20Hz - 20kHz Cyan/Amber glow) │  │  │ Module 2: Declip          │  │
│  ├────────────────────────────────┤  │  │ - Threshold, Reconstruct  │  │
│  │ Transport Bar:                 │  │  ├───────────────────────────┤  │
│  │ [Play] [Loop] [A/B] [Delta]    │  │  │ Module 3: Declick/Decrackle│ │
│  │ Timecode, Scrub Bar, VU Meters │  │  ├───────────────────────────┤  │
│  └────────────────────────────────┘  │  │ Module 4: Mouth Declick   │  │
│                                      │  ├───────────────────────────┤  │
│  Quick Load: [Stem A] [Stem B] [C]   │  │ Module 5: Deplosive       │  │
└──────────────────────────────────────┴──┴───────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DSP Audio Engine Core                           │
├────────────────────────────────────────────────────────────────────────┤
│ - AudioBuffer Source & AudioContext routing                            │
│ - OfflineAudioContext & Custom DSP Pipeline Worker                     │
│ - 24-bit Linear PCM RIFF WAV Serializer & Downloader                   │
│ - Synthesized / Preloaded Flawed Vocal Samples Generator               │
└────────────────────────────────────────────────────────────────────────┘
```

#### State & Data Model
- `audioState`:
  - `originalBuffer: AudioBuffer | null`: Raw uploaded or loaded stem.
  - `processedBuffer: AudioBuffer | null`: Cleaned and leveled stem.
  - `deltaBuffer: AudioBuffer | null`: Difference signal ($S_{\text{delta}} = S_{\text{dry}} - S_{\text{processed}}$).
  - `metadata`: `{ name: string, sampleRate: number, channels: number, bitDepth: number, duration: number, format: string }`.
- `transportState`:
  - `isPlaying: boolean`, `currentTime: number`, `loop: boolean`, `loopStart: number`, `loopEnd: number`.
  - `monitorMode: 'processed' | 'original' | 'delta'` (for instant seamless A/B auditioning).
- `modulesState`:
  - `leveler`: `{ enabled: boolean, mode: 'lead' | 'background', targetRms: number, speed: number, maxBoostDb: number, maxCutDb: number }`.
  - `declip`: `{ enabled: boolean, thresholdDb: number, headroomExpansionDb: number }`.
  - `declick`: `{ enabled: boolean, sensitivity: number, maxClickWidthMs: number }`.
  - `mouthDeclick`: `{ enabled: boolean, sensitivity: number, frequencyBias: number }`.
  - `deplosive`: `{ enabled: boolean, frequencyCutoff: number, sensitivity: number, ratio: number }`.
  - `decrackle`: `{ enabled: boolean, intensity: number }`.
