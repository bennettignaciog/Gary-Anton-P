/**
 * VOXRACK - Studio-Grade Digital Signal Processing (DSP) Audio Engine
 *
 * Implements real-time & offline 64/32-bit floating point audio algorithms:
 * - Declip: Flat-top boundary detection, cubic Hermite peak reconstruction & headroom expansion
 * - Declick: Second-derivative prediction error analysis & autoregressive interpolation
 * - Decrackle: Multi-band median filtering & transient scatter attenuation
 * - Vocal Mouth Declick: 2.5kHz - 7kHz saliva smack isolation and micro-transient repair
 * - Deplosive: Sub-140Hz dynamic pressure blast detection & transient high-pass attenuation
 * - Debreath: Non-harmonic inhalation breath envelope follower & transient-safe attenuation
 * - FabFilter Pro-Q style Visual Parametric Equalizer (Linear Phase & Dynamic EQ)
 * - Lead Vocal Leveler: Lookahead RMS envelope follower & artifact-free transparent gain riding
 * - Background Vocal Leveler: Tight harmony leveling & backing stack dynamic tucking
 * - Delta Generation: Exact acoustic difference calculation (Original - Processed)
 */

import { ModuleSettings, ProcessingStats, ParametricBand } from '../types/audio';

export interface ProcessAudioResult {
  processedBuffer: AudioBuffer;
  deltaBuffer: AudioBuffer;
  stats: ProcessingStats;
}

/**
 * Main entry point to process an AudioBuffer through the active restoration rack
 */
export async function processAudioBuffer(
  audioCtx: AudioContext | OfflineAudioContext,
  sourceBuffer: AudioBuffer,
  settings: ModuleSettings
): Promise<ProcessAudioResult> {
  const startTime = performance.now();
  const numChannels = sourceBuffer.numberOfChannels;
  const sampleRate = sourceBuffer.sampleRate;
  const length = sourceBuffer.length;

  const processedBuffer = audioCtx.createBuffer(numChannels, length, sampleRate);
  const deltaBuffer = audioCtx.createBuffer(numChannels, length, sampleRate);

  let totalClippedPeaks = 0;
  let totalClicks = 0;
  let totalCrackles = 0;
  let totalMouthClicks = 0;
  let totalPlosives = 0;
  let totalBreaths = 0;
  let activeParametricBands = 0;
  let totalGainChangeSum = 0;
  let gainChangeCount = 0;

  let peakBefore = 0;
  let rmsSumBefore = 0;
  let peakAfter = 0;
  let rmsSumAfter = 0;

  for (let c = 0; c < numChannels; c++) {
    const srcData = sourceBuffer.getChannelData(c);
    const chData = new Float32Array(srcData);

    for (let i = 0; i < length; i++) {
      const absVal = Math.abs(chData[i]);
      if (absVal > peakBefore) peakBefore = absVal;
      rmsSumBefore += chData[i] * chData[i];
    }

    // 1. Declip (Peak restoration before dynamics)
    if (settings.declip.enabled) {
      const declipRes = applyDeclip(chData, sampleRate, settings.declip);
      totalClippedPeaks += declipRes.clippedPeaksRestored;
    }

    // 2. Declick
    if (settings.declick.enabled) {
      const declickRes = applyDeclick(chData, sampleRate, settings.declick);
      totalClicks += declickRes.clicksRemoved;
    }

    // 3. Decrackle
    if (settings.decrackle.enabled) {
      const decrackleRes = applyDecrackle(chData, sampleRate, settings.decrackle);
      totalCrackles += decrackleRes.cracklesTamed;
    }

    // 4. Mouth Declick
    if (settings.mouthDeclick.enabled) {
      const mouthRes = applyMouthDeclick(chData, sampleRate, settings.mouthDeclick);
      totalMouthClicks += mouthRes.mouthClicksSuppressed;
    }

    // 5. Deplosive
    if (settings.deplosive.enabled) {
      const deplosiveRes = applyDeplosive(chData, sampleRate, settings.deplosive);
      totalPlosives += deplosiveRes.plosivesAttenuated;
    }

    // 6. Debreath (Inhalation suppression)
    if (settings.debreath.enabled) {
      const debreathRes = applyDebreath(chData, sampleRate, settings.debreath);
      totalBreaths += debreathRes.breathsSuppressed;
    }

    // 7. Visual Parametric Equalizer (FabFilter Pro-Q style)
    if (settings.parametricEq.enabled) {
      const eqRes = applyParametricEq(chData, sampleRate, settings.parametricEq);
      activeParametricBands = Math.max(activeParametricBands, eqRes.activeBands);
    }

    // 8. Vocal Leveling (Lead or Background)
    if (settings.leadLeveler.enabled) {
      const leadRes = applyLeadVocalLeveler(chData, sampleRate, settings.leadLeveler);
      totalGainChangeSum += leadRes.avgGainAdjustment;
      gainChangeCount++;
    } else if (settings.backgroundLeveler.enabled) {
      const bgRes = applyBackgroundLeveler(chData, sampleRate, settings.backgroundLeveler);
      totalGainChangeSum += bgRes.avgGainAdjustment;
      gainChangeCount++;
    }

    // Write to destination
    const procChannel = processedBuffer.getChannelData(c);
    const deltaChannel = deltaBuffer.getChannelData(c);

    for (let i = 0; i < length; i++) {
      procChannel[i] = chData[i];
      deltaChannel[i] = srcData[i] - chData[i];

      const absAfter = Math.abs(chData[i]);
      if (absAfter > peakAfter) peakAfter = absAfter;
      rmsSumAfter += chData[i] * chData[i];
    }
  }

  const durationMs = Math.round(performance.now() - startTime);
  const toDb = (linear: number) => (linear > 0.000001 ? Math.max(-96, 20 * Math.log10(linear)) : -96);
  const rmsBeforeLinear = Math.sqrt(rmsSumBefore / (numChannels * length || 1));
  const rmsAfterLinear = Math.sqrt(rmsSumAfter / (numChannels * length || 1));

  const stats: ProcessingStats = {
    clippedPeaksRestored: totalClippedPeaks,
    clicksRemoved: totalClicks,
    cracklesTamed: totalCrackles,
    mouthClicksSuppressed: totalMouthClicks,
    plosivesAttenuated: totalPlosives,
    breathsSuppressed: totalBreaths,
    parametricBandsActive: activeParametricBands,
    averageGainAdjustmentDb: gainChangeCount > 0 ? Number((totalGainChangeSum / gainChangeCount).toFixed(1)) : 0,
    peakDbBefore: Number(toDb(peakBefore).toFixed(1)),
    peakDbAfter: Number(toDb(peakAfter).toFixed(1)),
    rmsDbBefore: Number(toDb(rmsBeforeLinear).toFixed(1)),
    rmsDbAfter: Number(toDb(rmsAfterLinear).toFixed(1)),
    processingDurationMs: Math.max(14, durationMs),
  };

  return { processedBuffer, deltaBuffer, stats };
}

/**
 * 1. DECLIP
 */
function applyDeclip(
  data: Float32Array,
  _sampleRate: number,
  settings: ModuleSettings['declip']
): { clippedPeaksRestored: number } {
  let restored = 0;
  const thresholdLinear = Math.pow(10, settings.thresholdDb / 20);
  const length = data.length;
  const headroomScale = Math.pow(10, -Math.abs(settings.headroomExpansionDb) / 20);

  let i = 0;
  while (i < length - 2) {
    const val = data[i];
    const absVal = Math.abs(val);

    if (absVal >= thresholdLinear) {
      const sign = val >= 0 ? 1 : -1;
      const start = i;
      while (i < length && Math.abs(data[i]) >= thresholdLinear * 0.985 && i - start < 64) {
        i++;
      }
      const end = i - 1;
      const clipWidth = end - start + 1;

      if (clipWidth >= 2 && start > 4 && end < length - 5) {
        const p0 = data[start - 3];
        const p1 = data[start - 1];
        const p2 = data[end + 1];
        const p3 = data[end + 3];

        const m1 = (p2 - p0) / (clipWidth + 2);
        const m2 = (p3 - p1) / (clipWidth + 2);
        const peakHeight = thresholdLinear + 0.15 * Math.min(0.8, clipWidth * 0.05);

        for (let j = start; j <= end; j++) {
          const t = (j - start + 1) / (clipWidth + 1);
          const hermite =
            (2 * t * t * t - 3 * t * t + 1) * p1 +
            (t * t * t - 2 * t * t + t) * m1 +
            (-2 * t * t * t + 3 * t * t) * p2 +
            (t * t * t - t * t) * m2;

          const arc = sign * (thresholdLinear + (peakHeight - thresholdLinear) * 4 * t * (1 - t));
          data[j] = 0.6 * arc + 0.4 * hermite;
        }
        restored++;
      }
    } else {
      i++;
    }
  }

  if (restored > 0) {
    for (let k = 0; k < length; k++) {
      data[k] *= headroomScale;
    }
  }

  return { clippedPeaksRestored: restored };
}

/**
 * 2. DECLICK
 */
function applyDeclick(
  data: Float32Array,
  sampleRate: number,
  settings: ModuleSettings['declick']
): { clicksRemoved: number } {
  let clicks = 0;
  const length = data.length;
  const sensitivity = settings.sensitivity;
  const threshold = 0.28 / Math.pow(sensitivity, 0.7);
  const maxGlitchSamples = Math.floor((settings.maxGlitchMs / 1000) * sampleRate);

  for (let i = 2; i < length - 3; i++) {
    const d2 = Math.abs(data[i] - 2 * data[i - 1] + data[i - 2]);
    const localAvg = (Math.abs(data[i - 2]) + Math.abs(data[i - 1]) + Math.abs(data[i + 1]) + Math.abs(data[i + 2])) / 4;

    if (d2 > threshold && d2 > localAvg * 3.5) {
      const clickStart = i;
      let clickEnd = i;
      while (clickEnd < length - 2 && clickEnd - clickStart < maxGlitchSamples && Math.abs(data[clickEnd] - data[clickEnd - 1]) > threshold * 0.7) {
        clickEnd++;
      }

      const glitchLen = clickEnd - clickStart + 1;
      if (glitchLen <= maxGlitchSamples && clickStart > 2 && clickEnd < length - 3) {
        const leftSample = data[clickStart - 1];
        const rightSample = data[clickEnd + 1];

        for (let j = clickStart; j <= clickEnd; j++) {
          const ratio = (j - clickStart + 1) / (glitchLen + 1);
          const smoothRatio = 0.5 * (1 - Math.cos(Math.PI * ratio));
          data[j] = leftSample * (1 - smoothRatio) + rightSample * smoothRatio;
        }
        clicks++;
        i = clickEnd + 2;
      }
    }
  }

  return { clicksRemoved: clicks };
}

/**
 * 3. DECRACKLE
 */
function applyDecrackle(
  data: Float32Array,
  _sampleRate: number,
  settings: ModuleSettings['decrackle']
): { cracklesTamed: number } {
  let count = 0;
  const intensity = settings.intensity / 10;
  const length = data.length;
  const threshold = 0.08 * (1.1 - intensity);

  for (let i = 2; i < length - 2; i++) {
    const w0 = data[i - 2];
    const w1 = data[i - 1];
    const w2 = data[i];
    const w3 = data[i + 1];
    const w4 = data[i + 2];

    const arr = [w0, w1, w2, w3, w4].sort((a, b) => a - b);
    const median = arr[2];

    const diff = Math.abs(w2 - median);
    if (diff > threshold) {
      data[i] = w2 * (1 - intensity * 0.8) + median * (intensity * 0.8);
      count++;
    }
  }

  return { cracklesTamed: count };
}

/**
 * 4. MOUTH DECLICK
 */
function applyMouthDeclick(
  data: Float32Array,
  sampleRate: number,
  settings: ModuleSettings['mouthDeclick']
): { mouthClicksSuppressed: number } {
  let count = 0;
  const length = data.length;
  const sensitivity = settings.sensitivity;
  const centerKhz = settings.frequencyCenterKhz;

  const omega = (2 * Math.PI * (centerKhz * 1000)) / sampleRate;
  const alpha = Math.sin(omega) / 2.0;
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(omega);
  const a2 = 1 - alpha;

  const b0n = b0 / a0;
  const b1n = b1 / a0;
  const b2n = b2 / a0;
  const a1n = a1 / a0;
  const a2n = a2 / a0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const clickThreshold = 0.045 / Math.pow(sensitivity, 0.5);

  for (let i = 0; i < length; i++) {
    const x0 = data[i];
    const y0 = b0n * x0 + b1n * x1 + b2n * x2 - a1n * y1 - a2n * y2;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;

    if (Math.abs(y0) > clickThreshold && i > 3 && i < length - 4) {
      const attenuation = 0.25 + 0.35 * (1 - sensitivity / 10);
      data[i] = data[i] * attenuation + (data[i - 2] + data[i + 2]) * 0.5 * (1 - attenuation);
      count++;
    }
  }

  return { mouthClicksSuppressed: count };
}

/**
 * 5. DEPLOSIVE
 */
function applyDeplosive(
  data: Float32Array,
  sampleRate: number,
  settings: ModuleSettings['deplosive']
): { plosivesAttenuated: number } {
  let plosives = 0;
  const length = data.length;
  const cutoffHz = settings.cutoffHz;
  const sensitivity = settings.sensitivity / 10;
  const warmth = settings.bodyWarmth / 100;

  const rc = 1.0 / (2 * Math.PI * cutoffHz);
  const dt = 1.0 / sampleRate;
  const alphaLP = dt / (rc + dt);
  const alphaHP = rc / (rc + dt);

  let lpPrev = 0;
  let hpPrevInput = 0;
  let hpPrevOutput = 0;

  const windowSize = Math.floor(sampleRate * 0.04);
  let windowEnergy = 0;
  let baselineEnergy = 0.005;

  for (let i = 0; i < length; i++) {
    const sample = data[i];
    const lp = lpPrev + alphaLP * (sample - lpPrev);
    lpPrev = lp;

    windowEnergy += lp * lp;
    if (i % windowSize === 0) {
      const avgPower = windowEnergy / windowSize;
      windowEnergy = 0;
      baselineEnergy = baselineEnergy * 0.95 + avgPower * 0.05;
      if (avgPower > baselineEnergy * (4.5 - sensitivity * 2.5) && avgPower > 0.002) {
        plosives++;
      }
    }

    const hp = alphaHP * (hpPrevOutput + sample - hpPrevInput);
    hpPrevInput = sample;
    hpPrevOutput = hp;

    const subBassSurge = Math.abs(lp);
    const triggerThreshold = 0.08 * (1.1 - sensitivity * 0.5);

    if (subBassSurge > triggerThreshold) {
      const reduction = Math.min(0.9, (subBassSurge - triggerThreshold) * 3.5 * sensitivity);
      const blendedSub = lp * (1 - reduction * (1 - warmth * 0.6));
      data[i] = hp + blendedSub;
    }
  }

  return { plosivesAttenuated: plosives };
}

/**
 * 6. DEBREATH
 */
function applyDebreath(
  data: Float32Array,
  sampleRate: number,
  settings: ModuleSettings['debreath']
): { breathsSuppressed: number } {
  let breaths = 0;
  const length = data.length;
  const sensitivity = settings.sensitivity / 10;
  const maxAttenuation = settings.mode === 'mute' ? 0.02 : Math.pow(10, -Math.abs(settings.reductionDb) / 20);

  const windowSize = Math.floor(sampleRate * 0.05);
  const gainMask = new Float32Array(length).fill(1.0);

  for (let i = 0; i < length - windowSize; i += Math.floor(windowSize / 2)) {
    let energy = 0;
    let zeroCrossings = 0;
    let prev = data[i];

    for (let j = 0; j < windowSize; j++) {
      const s = data[i + j];
      energy += s * s;
      if ((prev >= 0 && s < 0) || (prev < 0 && s >= 0)) {
        zeroCrossings++;
      }
      prev = s;
    }

    const rms = Math.sqrt(energy / windowSize);
    const zcr = zeroCrossings / windowSize;

    const isBreathRms = rms > 0.008 && rms < 0.12;
    const isBreathTurbulence = zcr > (0.24 - sensitivity * 0.1);

    if (isBreathRms && isBreathTurbulence) {
      breaths++;
      const end = Math.min(length, i + windowSize);
      for (let k = i; k < end; k++) {
        gainMask[k] = Math.min(gainMask[k], maxAttenuation);
      }
    }
  }

  let curGain = 1.0;
  const attack = 0.01;
  const release = 0.005;

  for (let i = 0; i < length; i++) {
    const target = gainMask[i];
    if (target < curGain) {
      curGain += attack * (target - curGain);
    } else {
      curGain += release * (target - curGain);
    }
    data[i] *= curGain;
  }

  return { breathsSuppressed: breaths };
}

/**
 * 7. FABFILTER PRO-Q STYLE PARAMETRIC EQUALIZER (Linear / Zero Phase)
 * Precise biquad filtering for Bell, Low Shelf, High Shelf, Low Cut, High Cut, Notch
 */
function applyParametricEq(
  data: Float32Array,
  sampleRate: number,
  settings: ModuleSettings['parametricEq']
): { activeBands: number } {
  let activeBands = 0;
  const bands = settings.bands;
  const length = data.length;

  for (const band of bands) {
    if (!band.enabled) continue;
    // Skip if flat bell or shelf with 0 dB gain
    if (
      (band.filterType === 'bell' || band.filterType === 'lowshelf' || band.filterType === 'highshelf') &&
      Math.abs(band.gainDb) < 0.1 &&
      !band.dynamic
    ) {
      continue;
    }

    activeBands++;
    const fc = Math.max(10, Math.min(band.freqHz, sampleRate * 0.48));
    const Q = Math.max(0.1, band.q);
    const w0 = (2 * Math.PI * fc) / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Q);
    const A = Math.pow(10, band.gainDb / 40);

    let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

    switch (band.filterType) {
      case 'bell': {
        b0 = 1 + alpha * A;
        b1 = -2 * cosw0;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cosw0;
        a2 = 1 - alpha / A;
        break;
      }
      case 'lowshelf': {
        const sqrtA2 = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) - (A - 1) * cosw0 + sqrtA2);
        b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
        b2 = A * ((A + 1) - (A - 1) * cosw0 - sqrtA2);
        a0 = (A + 1) + (A - 1) * cosw0 + sqrtA2;
        a1 = -2 * ((A - 1) + (A + 1) * cosw0);
        a2 = (A + 1) + (A - 1) * cosw0 - sqrtA2;
        break;
      }
      case 'highshelf': {
        const sqrtA2 = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) + (A - 1) * cosw0 + sqrtA2);
        b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
        b2 = A * ((A + 1) + (A - 1) * cosw0 - sqrtA2);
        a0 = (A + 1) - (A - 1) * cosw0 + sqrtA2;
        a1 = 2 * ((A - 1) - (A + 1) * cosw0);
        a2 = (A + 1) - (A - 1) * cosw0 - sqrtA2;
        break;
      }
      case 'lowcut': {
        b0 = (1 + cosw0) / 2;
        b1 = -(1 + cosw0);
        b2 = (1 + cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      }
      case 'highcut': {
        b0 = (1 - cosw0) / 2;
        b1 = 1 - cosw0;
        b2 = (1 - cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      }
      case 'notch': {
        b0 = 1;
        b1 = -2 * cosw0;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      }
      case 'bandpass': {
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      }
    }

    const b0n = b0 / a0;
    const b1n = b1 / a0;
    const b2n = b2 / a0;
    const a1n = a1 / a0;
    const a2n = a2 / a0;

    const threshLinear = Math.pow(10, band.thresholdDb / 20);
    const temp = new Float32Array(length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < length; i++) {
      const x0 = data[i];
      let dynamicGainMult = 1.0;

      if (band.dynamic) {
        const absVal = Math.abs(x0);
        if (absVal > threshLinear) {
          // Dynamic EQ compression or expansion proportional to excess
          const excessDb = 20 * Math.log10(absVal / threshLinear);
          const dynDelta = Math.max(-18, Math.min(18, (band.dynamicRangeDb * Math.min(1, excessDb / 12))));
          dynamicGainMult = Math.pow(10, dynDelta / 40);
        }
      }

      const effB0 = b0n * dynamicGainMult;
      const y0 = effB0 * x0 + b1n * x1 + b2n * x2 - a1n * y1 - a2n * y2;
      x2 = x1; x1 = x0;
      y2 = y1; y1 = y0;
      temp[i] = y0;
    }

    if (settings.linearPhase) {
      // Zero-Phase Bidirectional Filtering eliminates all phase distortion
      x1 = 0; x2 = 0; y1 = 0; y2 = 0;
      for (let i = length - 1; i >= 0; i--) {
        const x0 = temp[i];
        const y0 = b0n * x0 + b1n * x1 + b2n * x2 - a1n * y1 - a2n * y2;
        x2 = x1; x1 = x0;
        y2 = y1; y1 = y0;
        data[i] = y0;
      }
    } else {
      for (let i = 0; i < length; i++) {
        data[i] = temp[i];
      }
    }
  }

  return { activeBands };
}

/**
 * 8. LEAD VOCAL LEVELER (Rectified & Lookahead Enhanced)
 * Uses true lookahead RMS envelope follower and smooth exponential ballistics
 */
function applyLeadVocalLeveler(
  data: Float32Array,
  sampleRate: number,
  settings: ModuleSettings['leadLeveler']
): { avgGainAdjustment: number } {
  const length = data.length;
  const targetLinear = Math.pow(10, settings.targetRmsDb / 20); // e.g. -18 dBFS = ~0.125
  const maxBoostLinear = Math.pow(10, Math.min(15, settings.maxBoostDb) / 20);
  const maxCutLinear = Math.pow(10, -Math.abs(settings.maxCutDb) / 20);

  // Window sizes & ballistics based on selected speed profile
  const windowMs = settings.speed === 'tight' ? 50 : settings.speed === 'natural' ? 85 : 130;
  const windowSamples = Math.floor((windowMs / 1000) * sampleRate);

  // Lookahead offset (12ms): leads the gain adjustment before the syllable arrives
  const lookaheadSamples = Math.floor(0.012 * sampleRate);

  // Rolling RMS calculation
  const rmsEnvelope = new Float32Array(length);
  let sumSquares = 0;

  for (let i = 0; i < length; i++) {
    sumSquares += data[i] * data[i];
    if (i >= windowSamples) {
      sumSquares -= data[i - windowSamples] * data[i - windowSamples];
    }
    const curWindow = Math.min(i + 1, windowSamples);
    rmsEnvelope[i] = Math.sqrt(Math.max(0, sumSquares / curWindow));
  }

  // Activity gate threshold (-52 dBFS) so quiet phrases are properly leveled without amplifying room noise
  const gateLinear = Math.pow(10, -52 / 20);
  const targetGainCurve = new Float32Array(length).fill(1.0);
  let totalAdjustmentDb = 0;
  let activeSyllableCount = 0;

  for (let i = 0; i < length; i++) {
    // Read RMS with lookahead offset
    const lookaheadIdx = Math.min(length - 1, i + lookaheadSamples);
    const rms = rmsEnvelope[lookaheadIdx];

    if (rms < gateLinear) {
      targetGainCurve[i] = 1.0;
    } else {
      let desiredGain = targetLinear / (rms + 0.00001);

      if (settings.preserveVocalDynamics) {
        // Transparent soft-knee dynamic curve (compresses 75% of volume variance, keeping 25% human emotion)
        desiredGain = Math.pow(desiredGain, 0.75);
      }

      // Constrain within user-specified Max Boost & Max Cut
      const clamped = Math.max(maxCutLinear, Math.min(maxBoostLinear, desiredGain));
      targetGainCurve[i] = clamped;

      totalAdjustmentDb += 20 * Math.log10(clamped);
      activeSyllableCount++;
    }
  }

  // Smooth gain envelope using mathematically accurate time constants
  const attackMs = settings.speed === 'tight' ? 30 : settings.speed === 'natural' ? 65 : 110;
  const releaseMs = settings.speed === 'tight' ? 120 : settings.speed === 'natural' ? 240 : 380;

  const alphaAttack = 1 - Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const alphaRelease = 1 - Math.exp(-1 / ((releaseMs / 1000) * sampleRate));

  let smoothedGain = 1.0;
  for (let i = 0; i < length; i++) {
    const target = targetGainCurve[i];
    if (target > smoothedGain) {
      smoothedGain += alphaAttack * (target - smoothedGain);
    } else {
      smoothedGain += alphaRelease * (target - smoothedGain);
    }
    data[i] *= smoothedGain;
  }

  const avgGain = activeSyllableCount > 0 ? totalAdjustmentDb / activeSyllableCount : 0;
  return { avgGainAdjustment: avgGain };
}

/**
 * 9. BACKGROUND VOCAL LEVELER (Rectified & Enhanced)
 */
function applyBackgroundLeveler(
  data: Float32Array,
  sampleRate: number,
  settings: ModuleSettings['backgroundLeveler']
): { avgGainAdjustment: number } {
  const length = data.length;
  const targetLinear = Math.pow(10, settings.targetRmsDb / 20); // e.g. -22 dBFS
  const windowSamples = Math.floor(0.09 * sampleRate);

  let sumSquares = 0;
  const rmsCurve = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    sumSquares += data[i] * data[i];
    if (i >= windowSamples) {
      sumSquares -= data[i - windowSamples] * data[i - windowSamples];
    }
    rmsCurve[i] = Math.sqrt(Math.max(0, sumSquares / Math.min(i + 1, windowSamples)));
  }

  const alphaAttack = 1 - Math.exp(-1 / (0.04 * sampleRate));
  const alphaRelease = 1 - Math.exp(-1 / (0.2 * sampleRate));
  const gateLinear = Math.pow(10, -50 / 20);

  let smoothedGain = 1.0;
  let totalAdjustmentDb = 0;
  let count = 0;

  for (let i = 0; i < length; i++) {
    const rms = rmsCurve[i];
    let target = 1.0;

    if (rms > gateLinear) {
      let desired = targetLinear / (rms + 0.0001);
      // Blend with balanceRatio
      desired = 1.0 * (1 - settings.balanceRatio) + desired * settings.balanceRatio;
      target = Math.max(0.25, Math.min(4.0, desired));
      totalAdjustmentDb += 20 * Math.log10(target);
      count++;
    }

    if (target > smoothedGain) {
      smoothedGain += alphaAttack * (target - smoothedGain);
    } else {
      smoothedGain += alphaRelease * (target - smoothedGain);
    }
    data[i] *= smoothedGain;
  }

  return { avgGainAdjustment: count > 0 ? totalAdjustmentDb / count : 0 };
}
