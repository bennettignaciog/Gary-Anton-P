/**
 * AudioFix Studio - 24-bit Linear PCM RIFF WAV Encoder & Audio Exporter
 * 
 * Accurately encodes Float32 / Float64 audio buffers into standard
 * 24-bit fixed-point PCM WAV (format code 1, 3 bytes per sample) with
 * zero bit-depth reduction, preservation of sample rates up to 192 kHz,
 * and no lossy recompression or watermarking.
 */

export function encode24BitWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 3; // 24-bit = 3 bytes
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  // RIFF Chunk Descriptor (12 bytes)
  // + "fmt " subchunk (24 bytes)
  // + "data" subchunk header (8 bytes)
  // + PCM audio data
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // Chunk size
  writeString(8, 'WAVE');

  // 2. "fmt " subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = Linear PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 24, true); // BitsPerSample = 24

  // 3. "data" subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // 4. Interleaved 24-bit PCM audio samples
  let offset = 44;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  // 24-bit range: -8,388,608 to 8,388,607
  const maxSample = 8388607;
  const minSample = -8388608;

  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = channelData[c][i];
      // Clamp to [-1.0, 1.0]
      const clamped = Math.max(-1.0, Math.min(1.0, sample));
      // Scale to signed 24-bit integer
      const intSample = Math.round(clamped < 0 ? clamped * 8388608 : clamped * maxSample);
      const val = Math.max(minSample, Math.min(maxSample, intSample));

      // Little-endian 3-byte serialization
      view.setUint8(offset, val & 0xff);
      view.setUint8(offset + 1, (val >> 8) & 0xff);
      view.setUint8(offset + 2, (val >> 16) & 0xff);
      offset += 3;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Inspects a binary audio buffer header to detect bit depth and format info
 */
export function inspectAudioHeader(buffer: ArrayBuffer): { bitDepth: number; format: string } {
  try {
    if (buffer.byteLength < 44) return { bitDepth: 24, format: 'Audio' };
    const view = new DataView(buffer);
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));

    if (riff === 'RIFF' && wave === 'WAVE') {
      // Find "fmt " chunk
      let pos = 12;
      while (pos + 8 < buffer.byteLength) {
        const id = String.fromCharCode(view.getUint8(pos), view.getUint8(pos + 1), view.getUint8(pos + 2), view.getUint8(pos + 3));
        const size = view.getUint32(pos + 4, true);
        if (id === 'fmt ') {
          const bitsPerSample = view.getUint16(pos + 14, true);
          return { bitDepth: bitsPerSample || 24, format: 'WAV' };
        }
        pos += 8 + size;
      }
    }

    // Check FLAC
    const flac = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (flac === 'fLaC') {
      return { bitDepth: 24, format: 'FLAC' };
    }

    // Check AIFF
    if (riff === 'FORM') {
      const aiff = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      if (aiff === 'AIFF' || aiff === 'AIFC') {
        return { bitDepth: 24, format: 'AIFF' };
      }
    }
  } catch (err) {
    console.warn('Could not inspect audio header, falling back to 24-bit default', err);
  }

  return { bitDepth: 24, format: 'WAV' };
}

/**
 * Triggers a browser file download for a processed audio blob
 */
export function downloadAudioFile(blob: Blob, originalFilename: string, suffix = '_repaired_24bit.wav'): void {
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  const downloadName = `${baseName}${suffix}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}
