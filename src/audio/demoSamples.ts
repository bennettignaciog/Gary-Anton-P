/**
 * AudioFix Studio - Procedural Realistic Flawed Vocal Takes Generator
 * 
 * Synthesizes high-definition 48 kHz vocal takes exhibiting realistic defects:
 * - Stem A: "Lead Vocal - Clipped & Hot Take" (Crest clipping + dynamic phrase shifts)
 * - Stem B: "Podcast Voiceover - Close-Mic" (Saliva mouth clicks + low-end plosives)
 * - Stem C: "Backing Harmonies - Uneven & Sibilant" (Multi-voice dynamic imbalance + crackle)
 */

export interface DemoStem {
  id: string;
  name: string;
  category: string;
  description: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
  flaws: string[];
}

export const DEMO_STEMS: DemoStem[] = [
  {
    id: 'lead-vocal-clipped',
    name: 'Lead Vocal - Hot Take & Clip',
    category: 'Lead Vocal',
    description: 'Dynamic rock vocal with harsh digital preamp clipping on belt notes and uneven phrase volume.',
    durationSec: 8,
    sampleRate: 48000,
    channels: 2,
    flaws: ['Digital peak clipping', 'Phrase volume dropouts', 'Uncontrolled crest factor'],
  },
  {
    id: 'podcast-plosives-clicks',
    name: 'Podcast VO - Plosives & Mouth Clicks',
    category: 'Spoken Word',
    description: 'Close-mic studio voiceover with loud "p" plosive diaphragm blasts and wet saliva lip clicks.',
    durationSec: 7.5,
    sampleRate: 48000,
    channels: 2,
    flaws: ['Sub-120Hz plosive pops', 'Saliva mouth clicks (3-6 kHz)', 'Room transient noise'],
  },
  {
    id: 'backing-vocal-harmonies',
    name: 'Backing Harmonies - Uneven Stack',
    category: 'Background Vocals',
    description: 'Three-part vocal harmony stack with inconsistent balance, phrase sibilance, and subtle preamp crackle.',
    durationSec: 8,
    sampleRate: 48000,
    channels: 2,
    flaws: ['Unbalanced harmony levels', 'Surface crackle', 'Erratic background dynamics'],
  },
];

/**
 * Procedurally generates an AudioBuffer matching the requested demo stem
 */
export function generateDemoAudioBuffer(audioCtx: AudioContext, stemId: string): AudioBuffer {
  const stem = DEMO_STEMS.find((s) => s.id === stemId) || DEMO_STEMS[0];
  const sampleRate = stem.sampleRate;
  const numChannels = stem.channels;
  const totalSamples = Math.floor(stem.durationSec * sampleRate);

  const buffer = audioCtx.createBuffer(numChannels, totalSamples, sampleRate);

  if (stemId === 'lead-vocal-clipped') {
    generateLeadVocalClipped(buffer, sampleRate);
  } else if (stemId === 'podcast-plosives-clicks') {
    generatePodcastPlosivesClicks(buffer, sampleRate);
  } else {
    generateBackingHarmonies(buffer, sampleRate);
  }

  return buffer;
}

/**
 * Synthesizes dynamic lead vocal singing with intentional harsh digital clipping
 */
function generateLeadVocalClipped(buffer: AudioBuffer, sampleRate: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = buffer.length;

  // Singing melody frequencies (E4, G4, A4, B4, A4, G4, E4)
  const notes = [
    { pitch: 329.63, start: 0.3, dur: 1.1, amp: 0.25 }, // Quiet phrase (needs leveling boost)
    { pitch: 392.0, start: 1.5, dur: 0.9, amp: 0.35 },
    { pitch: 440.0, start: 2.5, dur: 1.4, amp: 0.65 }, // Building
    { pitch: 493.88, start: 4.0, dur: 1.8, amp: 1.45, isClipped: true }, // Huge belted climax (heavily clipped!)
    { pitch: 440.0, start: 5.9, dur: 0.8, amp: 0.5 },
    { pitch: 329.63, start: 6.8, dur: 1.0, amp: 0.2 }, // Very quiet tail
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const noteT = t - note.start;
        // Vibrato (5.4 Hz, begins after 0.2s of note)
        const vibFactor = Math.min(1.0, Math.max(0, (noteT - 0.2) * 2));
        const freq = note.pitch * (1 + 0.018 * Math.sin(2 * Math.PI * 5.4 * noteT) * vibFactor);

        // Vocal Formant modeling: Fundamental + 2nd, 3rd, 4th harmonics with 'Ah' vowel resonance
        const f0 = Math.sin(2 * Math.PI * freq * t);
        const f1 = 0.55 * Math.sin(2 * Math.PI * freq * 2 * t);
        const f2 = 0.38 * Math.sin(2 * Math.PI * freq * 3 * t);
        const f3 = 0.22 * Math.sin(2 * Math.PI * freq * 4 * t);
        const formant = f0 + f1 + f2 + f3;

        // Envelope (smooth attack and release)
        const attack = Math.min(1.0, noteT / 0.08);
        const release = Math.min(1.0, (note.dur - noteT) / 0.12);
        const env = attack * release * note.amp;

        sample += formant * env;

        // Intentional harsh digital clipping on the climax
        if (note.isClipped && noteT > 0.15 && noteT < note.dur - 0.15) {
          // Flat top saturation clipping at +/- 0.88 with harmonic grit
          if (sample > 0.88) sample = 0.88;
          if (sample < -0.88) sample = -0.88;
        }
      }
    }

    // Stereo spread
    left[i] = sample;
    right[i] = sample * 0.98;
  }
}

/**
 * Synthesizes close-mic voiceover with distinct plosive booms and wet mouth clicks
 */
function generatePodcastPlosivesClicks(buffer: AudioBuffer, sampleRate: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = buffer.length;

  // Spoken voice fundamental ~125 Hz (male baritone / podcast voice)
  const syllables = [
    { start: 0.3, dur: 0.45, text: 'Wel-' },
    { start: 0.8, dur: 0.5, text: 'come' },
    { start: 1.5, dur: 0.6, isPlosive: true, text: 'to the' }, // PLOSIVE 'P/T'
    { start: 2.2, dur: 0.7, hasMouthClick: true, text: 'pod-' }, // Saliva click
    { start: 3.0, dur: 0.65, text: 'cast' },
    { start: 3.9, dur: 0.7, isPlosive: true, text: 'pro-' }, // HEAVY PLOSIVE
    { start: 4.8, dur: 0.6, hasMouthClick: true, text: 'duc-' }, // Saliva click
    { start: 5.5, dur: 0.9, text: 'tion' },
    { start: 6.5, dur: 0.8, text: 'studio' },
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const syl of syllables) {
      if (t >= syl.start && t < syl.start + syl.dur) {
        const sylT = t - syl.start;
        // Pitch contour for spoken inflection
        const speechPitch = 125 - 15 * (sylT / syl.dur);

        // Vocal pulse train
        const h1 = Math.sin(2 * Math.PI * speechPitch * t);
        const h2 = 0.5 * Math.sin(2 * Math.PI * speechPitch * 2 * t);
        const h3 = 0.35 * Math.sin(2 * Math.PI * speechPitch * 3 * t);
        const h4 = 0.2 * Math.sin(2 * Math.PI * speechPitch * 5 * t);
        const voice = (h1 + h2 + h3 + h4) * 0.38;

        const env = Math.sin((Math.PI * sylT) / syl.dur);
        sample += voice * env;

        // Add heavy sub-bass plosive burst (<110 Hz pressure pop hitting capsule)
        if (syl.isPlosive && sylT < 0.16) {
          const plosiveFreq = 65 + 40 * (1 - sylT / 0.16);
          const plosiveDamp = Math.exp(-sylT * 22);
          const plosivePop = 0.85 * Math.sin(2 * Math.PI * plosiveFreq * sylT) * plosiveDamp;
          sample += plosivePop;
        }

        // Add wet saliva mouth click (sharp 3.5k - 6k impulse spike)
        if (syl.hasMouthClick && sylT >= 0.08 && sylT < 0.092) {
          const clickT = sylT - 0.08;
          const clickNoise = (Math.random() * 2 - 1) * Math.exp(-clickT * 800) * 0.75;
          const clickOsc = Math.sin(2 * Math.PI * 4600 * clickT) * Math.exp(-clickT * 600) * 0.6;
          sample += clickNoise + clickOsc;
        }
      }
    }

    // Occasional breathing / preamp noise
    sample += (Math.random() * 2 - 1) * 0.002;

    left[i] = sample;
    right[i] = sample;
  }
}

/**
 * Synthesizes 3-part backing harmonies with uneven balance and vinyl/preamp crackle
 */
function generateBackingHarmonies(buffer: AudioBuffer, sampleRate: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = buffer.length;

  // Harmony chord progressions (C major -> F major -> G major -> C major)
  const chords = [
    { start: 0.4, dur: 1.7, freqs: [261.63, 329.63, 392.0], amp: 0.45 },
    { start: 2.3, dur: 1.8, freqs: [349.23, 440.0, 523.25], amp: 0.18 }, // Very quiet (drops in mix)
    { start: 4.3, dur: 1.7, freqs: [392.0, 493.88, 587.33], amp: 0.62 }, // Loud spike
    { start: 6.2, dur: 1.5, freqs: [261.63, 329.63, 392.0], amp: 0.35 },
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sampleL = 0;
    let sampleR = 0;

    for (const chord of chords) {
      if (t >= chord.start && t < chord.start + chord.dur) {
        const chordT = t - chord.start;
        const env = Math.sin((Math.PI * chordT) / chord.dur) * chord.amp;

        // Root
        const v1 = Math.sin(2 * Math.PI * chord.freqs[0] * t) * 0.5;
        // 3rd (panned slightly left)
        const v2 = Math.sin(2 * Math.PI * chord.freqs[1] * t) * 0.4;
        // 5th (panned slightly right)
        const v3 = Math.sin(2 * Math.PI * chord.freqs[2] * t) * 0.4;

        sampleL += (v1 * 0.7 + v2 * 0.8 + v3 * 0.3) * env;
        sampleR += (v1 * 0.7 + v2 * 0.3 + v3 * 0.8) * env;
      }
    }

    // Add intermittent surface crackle / vinyl clicks
    if (Math.random() < 0.00035) {
      const crackleBurst = (Math.random() * 2 - 1) * 0.45;
      sampleL += crackleBurst;
      sampleR += crackleBurst * 0.8;
    }

    left[i] = sampleL;
    right[i] = sampleR;
  }
}
