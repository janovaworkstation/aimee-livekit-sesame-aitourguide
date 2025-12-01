// Audio Format Conversion Utilities
// Handles conversion between LiveKit and OpenAI Realtime audio formats

export interface AudioFormat {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

// Standard audio formats
export const FORMATS = {
  LIVEKIT_DEFAULT: { sampleRate: 48000, channels: 1, bitsPerSample: 16 },
  OPENAI_REALTIME: { sampleRate: 24000, channels: 1, bitsPerSample: 16 }
} as const;

/**
 * Convert PCM audio sample rate using basic linear interpolation
 * Note: This is a simplified resampler for the POC. Production should use a proper DSP library.
 */
export function resamplePCM16(
  inputBuffer: Buffer,
  fromSampleRate: number,
  toSampleRate: number
): Buffer {
  if (fromSampleRate === toSampleRate) {
    return inputBuffer;
  }

  const ratio = fromSampleRate / toSampleRate;
  const inputSamples = inputBuffer.length / 2; // 16-bit samples
  const outputSamples = Math.floor(inputSamples / ratio);
  const outputBuffer = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const sourceIndex = Math.floor(i * ratio) * 2;

    // Ensure we don't read beyond buffer bounds
    if (sourceIndex + 1 < inputBuffer.length) {
      const sample = inputBuffer.readInt16LE(sourceIndex);
      outputBuffer.writeInt16LE(sample, i * 2);
    }
  }

  return outputBuffer;
}

/**
 * Convert LiveKit audio frame to OpenAI Realtime format
 */
export function livekitToRealtime(audioData: Buffer, sourceFormat?: AudioFormat): Buffer {
  const source = sourceFormat || FORMATS.LIVEKIT_DEFAULT;
  const target = FORMATS.OPENAI_REALTIME;

  // Convert sample rate if needed
  let processedBuffer = audioData;
  if (source.sampleRate !== target.sampleRate) {
    processedBuffer = resamplePCM16(audioData, source.sampleRate, target.sampleRate);
  }

  // Handle channel conversion (mono to mono, or stereo to mono)
  if (source.channels === 2 && target.channels === 1) {
    // Convert stereo to mono by averaging channels
    const samples = processedBuffer.length / 4; // 2 channels * 2 bytes per sample
    const monoBuffer = Buffer.alloc(samples * 2);

    for (let i = 0; i < samples; i++) {
      const leftSample = processedBuffer.readInt16LE(i * 4);
      const rightSample = processedBuffer.readInt16LE(i * 4 + 2);
      const monoSample = Math.floor((leftSample + rightSample) / 2);
      monoBuffer.writeInt16LE(monoSample, i * 2);
    }

    processedBuffer = monoBuffer;
  }

  return processedBuffer;
}

/**
 * Convert OpenAI Realtime audio to LiveKit format
 */
export function realtimeToLivekit(audioData: Buffer, targetFormat?: AudioFormat): Buffer {
  const source = FORMATS.OPENAI_REALTIME;
  const target = targetFormat || FORMATS.LIVEKIT_DEFAULT;

  // Convert sample rate if needed
  let processedBuffer = audioData;
  if (source.sampleRate !== target.sampleRate) {
    processedBuffer = resamplePCM16(audioData, source.sampleRate, target.sampleRate);
  }

  // Handle channel conversion (mono to stereo if needed)
  if (source.channels === 1 && target.channels === 2) {
    // Convert mono to stereo by duplicating the channel
    const samples = processedBuffer.length / 2;
    const stereoBuffer = Buffer.alloc(samples * 4);

    for (let i = 0; i < samples; i++) {
      const sample = processedBuffer.readInt16LE(i * 2);
      stereoBuffer.writeInt16LE(sample, i * 4);     // Left channel
      stereoBuffer.writeInt16LE(sample, i * 4 + 2); // Right channel
    }

    processedBuffer = stereoBuffer;
  }

  return processedBuffer;
}

/**
 * Validate audio buffer format and length
 */
export function validateAudioBuffer(buffer: Buffer, format: AudioFormat): boolean {
  // Check if buffer length is valid for the format
  const bytesPerSample = (format.bitsPerSample / 8) * format.channels;
  const isValidLength = buffer.length % bytesPerSample === 0;

  if (!isValidLength) {
    console.warn(`AudioUtils: Invalid buffer length ${buffer.length} for format`, format);
    return false;
  }

  return true;
}

/**
 * Calculate audio duration in milliseconds
 */
export function calculateAudioDuration(buffer: Buffer, format: AudioFormat): number {
  const bytesPerSample = (format.bitsPerSample / 8) * format.channels;
  const samples = buffer.length / bytesPerSample;
  return (samples / format.sampleRate) * 1000;
}

/**
 * Apply gain to PCM16 audio buffer
 */
export function applyGain(buffer: Buffer, gainDb: number): Buffer {
  const gain = Math.pow(10, gainDb / 20);
  const outputBuffer = Buffer.alloc(buffer.length);

  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i);
    const amplifiedSample = Math.max(-32768, Math.min(32767, Math.floor(sample * gain)));
    outputBuffer.writeInt16LE(amplifiedSample, i);
  }

  return outputBuffer;
}

/**
 * Detect audio levels for VAD (Voice Activity Detection) debugging
 */
export function calculateRMS(buffer: Buffer): number {
  let sum = 0;
  const samples = buffer.length / 2;

  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i);
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples);
}

/**
 * Log audio buffer statistics for debugging
 */
export function logAudioStats(buffer: Buffer, label: string, format: AudioFormat): void {
  const rms = calculateRMS(buffer);
  const duration = calculateAudioDuration(buffer, format);
  const isValid = validateAudioBuffer(buffer, format);

  console.log(`AudioUtils [${label}]: ${buffer.length}b, ${duration.toFixed(1)}ms, RMS: ${rms.toFixed(1)}, Valid: ${isValid}`);
}