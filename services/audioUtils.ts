

import { DEFAULT_SAMPLE_RATE, BEAT_PATTERNS } from '../constants';
import { Track } from '../types';

let audioContext: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    try {
        // Attempt to support high sample rates up to 192kHz
        audioContext = new Ctx({
          sampleRate: 192000,
        });
    } catch (e) {
        console.warn("192kHz sample rate not supported, falling back to system default.");
        audioContext = new Ctx();
    }
  }
  return audioContext;
};

export const decodeAudioData = async (arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
};

export const createEmptyBuffer = (ctx: AudioContext, seconds: number): AudioBuffer => {
  return ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
};

// --- Playback Utility for Previews ---
let currentPreviewSource: AudioBufferSourceNode | null = null;

export const playBuffer = (buffer: AudioBuffer) => {
    const ctx = getAudioContext();
    if (currentPreviewSource) {
        try { currentPreviewSource.stop(); } catch(e) {}
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    currentPreviewSource = source;
};

// --- Time Stretching (Granular Synthesis) ---

/**
 * Changes duration WITHOUT changing pitch using a simplified OLA (Overlap-Add) Granular method.
 * @param buffer Input buffer
 * @param playbackRate Target rate (0.5 = half speed/double duration, 2.0 = double speed/half duration)
 */
export const granularTimeStretch = async (buffer: AudioBuffer, playbackRate: number): Promise<AudioBuffer> => {
    // If rate is 1, return copy
    if (playbackRate === 1.0) return buffer;

    const channels = buffer.numberOfChannels;
    const inputLen = buffer.length;
    // New length is inverse of rate. (2x speed = 0.5x length)
    const outputLen = Math.floor(inputLen / playbackRate);
    const sampleRate = buffer.sampleRate;

    const ctx = new OfflineAudioContext(channels, outputLen, sampleRate);
    const outputBuffer = ctx.createBuffer(channels, outputLen, sampleRate);

    // Granular Parameters
    const grainSize = Math.floor(sampleRate * 0.08); // 80ms grains
    const overlap = Math.floor(grainSize * 0.5); // 50% overlap
    
    // We move through the INPUT at 'playbackRate' speed relative to output
    // But we copy 'grainSize' chunks 1:1 to preserve pitch.
    
    for (let c = 0; c < channels; c++) {
        const inputData = buffer.getChannelData(c);
        const outputData = outputBuffer.getChannelData(c);
        
        let inputOffset = 0;
        let outputOffset = 0;
        
        // While we have room in output and input
        while (outputOffset + grainSize < outputLen && inputOffset + grainSize < inputLen) {
            
            // 1. Fade Out / In Windowing (Hanning-ish)
            for (let i = 0; i < grainSize; i++) {
                const inputIdx = Math.floor(inputOffset) + i;
                const outputIdx = outputOffset + i;
                
                if (inputIdx >= inputLen || outputIdx >= outputLen) break;

                // Simple linear crossfade window for the overlap region
                // To blend strictly, we just add. A real implementation uses proper window functions.
                // Here we simply copy the grain. The jitter comes from the phase discontinuity.
                // We'll do a simple OLA.
                
                let gain = 1.0;
                if (i < overlap) {
                    gain = i / overlap; // Fade In
                } else if (i > grainSize - overlap) {
                    gain = (grainSize - i) / overlap; // Fade Out
                }

                // Add to output (OLA)
                outputData[outputIdx] += inputData[inputIdx] * gain;
            }

            // Move heads
            // Output moves by the non-overlapped amount (hop size)
            const outputHop = grainSize - overlap;
            outputOffset += outputHop;
            
            // Input moves by (hop size * rate) to achieve time stretch
            inputOffset += outputHop * playbackRate;
        }
    }

    // Normalize output to prevent clipping from OLA
    return normalizeBuffer(outputBuffer);
};

// --- BPM Detection ---

export const detectBPM = async (buffer: AudioBuffer): Promise<number> => {
    try {
        let analysisBuffer = buffer;
        if (buffer.duration > 40) {
            const start = Math.floor(buffer.duration / 2) - 20;
            const end = start + 40;
            analysisBuffer = trimBuffer(buffer, start, end);
        }

        const offlineCtx = new OfflineAudioContext(1, analysisBuffer.length, analysisBuffer.sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = analysisBuffer;

        const lowpass = offlineCtx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 400; 
        lowpass.Q.value = 1;

        const highpass = offlineCtx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 70;
        highpass.Q.value = 1;

        source.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(offlineCtx.destination);
        source.start(0);

        const rendered = await offlineCtx.startRendering();
        const data = rendered.getChannelData(0);

        const windowSize = Math.floor(analysisBuffer.sampleRate * 0.005); 
        const energyProfile: number[] = [];
        
        for (let i = 0; i < data.length; i += windowSize) {
            let sum = 0;
            for (let j = 0; j < windowSize && i + j < data.length; j++) {
                sum += data[i + j] * data[i + j];
            }
            energyProfile.push(Math.sqrt(sum / windowSize));
        }

        const onsetProfile: number[] = [];
        for (let i = 1; i < energyProfile.length; i++) {
            const diff = energyProfile[i] - energyProfile[i - 1];
            onsetProfile.push(Math.max(diff, 0)); 
        }

        const minBPM = 60;
        const maxBPM = 180;
        const minLag = Math.floor(60 / (maxBPM * 0.005));
        const maxLag = Math.ceil(60 / (minBPM * 0.005));

        const correlations: { bpm: number, strength: number }[] = [];
        const searchLen = Math.min(onsetProfile.length, 3000); 

        for (let lag = minLag; lag <= maxLag; lag++) {
            let currentCorrelation = 0;
            for (let i = 0; i < searchLen - lag; i++) {
                currentCorrelation += onsetProfile[i] * onsetProfile[i + lag];
            }
            correlations.push({
                bpm: 60 / (lag * 0.005),
                strength: currentCorrelation
            });
        }

        correlations.sort((a, b) => b.strength - a.strength);
        if (correlations.length === 0) return 0;

        const topCandidates = correlations.slice(0, 5);
        let chosenBPM = topCandidates[0].bpm;
        const maxStrength = topCandidates[0].strength;

        for (let i = 1; i < topCandidates.length; i++) {
            const candidate = topCandidates[i];
            if (candidate.strength > maxStrength * 0.75) {
                const winnerIsExtreme = chosenBPM < 90 || chosenBPM > 160;
                const candidateIsNormal = candidate.bpm >= 90 && candidate.bpm <= 160;
                if (winnerIsExtreme && candidateIsNormal) {
                    chosenBPM = candidate.bpm;
                }
                if (Math.abs(candidate.bpm - 2 * chosenBPM) < 5) {
                    chosenBPM = candidate.bpm;
                }
            }
        }
        return Math.round(chosenBPM);
    } catch (e) {
        console.error("BPM Detection Error", e);
        return 0; 
    }
};

// --- Preview Generation ---
export const generateProjectPreview = (tracks: Track[], width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, width, height);

    if (tracks.length === 0) return canvas.toDataURL();

    const maxDur = Math.max(...tracks.map(t => t.startTime + t.duration));
    const scaleX = width / (maxDur || 1);
    
    tracks.forEach(track => {
        const x = track.startTime * scaleX;
        const w = Math.max(2, track.duration * scaleX);
        const laneH = height / 5; 
        const y = (track.lane % 5) * laneH + 2;
        const h = laneH - 4;

        ctx.fillStyle = track.color;
        ctx.fillRect(x, y, w, h);
    });

    return canvas.toDataURL('image/png');
};

// --- Offline Processing Utilities ---

export const applyFade = async (buffer: AudioBuffer, type: 'in' | 'out', duration: number): Promise<AudioBuffer> => {
    const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);
    
    const fadeDur = Math.min(duration, buffer.duration);
    
    if (type === 'in') {
        gain.gain.setValueAtTime(0, 0);
        gain.gain.linearRampToValueAtTime(1, fadeDur);
    } else {
        gain.gain.setValueAtTime(1, buffer.duration - fadeDur);
        gain.gain.linearRampToValueAtTime(0, buffer.duration);
    }
    
    source.start();
    return await ctx.startRendering();
};

export const mergeBuffers = async (left: AudioBuffer, right: AudioBuffer, overlapDuration: number): Promise<AudioBuffer> => {
    const channels = Math.max(left.numberOfChannels, right.numberOfChannels);
    const sampleRate = left.sampleRate;
    
    const totalDuration = left.duration + right.duration - overlapDuration;
    const length = Math.ceil(totalDuration * sampleRate);
    
    const ctx = new OfflineAudioContext(channels, length, sampleRate);
    
    const srcLeft = ctx.createBufferSource();
    srcLeft.buffer = left;
    const gainLeft = ctx.createGain();
    srcLeft.connect(gainLeft);
    gainLeft.connect(ctx.destination);
    
    const srcRight = ctx.createBufferSource();
    srcRight.buffer = right;
    const gainRight = ctx.createGain();
    srcRight.connect(gainRight);
    gainRight.connect(ctx.destination);
    
    const overlapStart = left.duration - overlapDuration;
    
    gainLeft.gain.setValueAtTime(1, overlapStart);
    gainLeft.gain.linearRampToValueAtTime(0, left.duration);
    
    const rightStartTime = overlapStart;
    gainRight.gain.setValueAtTime(0, rightStartTime);
    gainRight.gain.linearRampToValueAtTime(1, rightStartTime + overlapDuration);
    
    srcLeft.start(0);
    srcRight.start(rightStartTime);
    
    return await ctx.startRendering();
};

export const changeSpeed = async (buffer: AudioBuffer, playbackRate: number, preservePitch: boolean = false): Promise<AudioBuffer> => {
    if (preservePitch) {
        // Use Granular Time Stretch
        return await granularTimeStretch(buffer, playbackRate);
    } else {
        // Standard Resampling (Changes Pitch)
        const newDuration = buffer.duration / playbackRate;
        const ctx = new OfflineAudioContext(
            buffer.numberOfChannels, 
            Math.ceil(newDuration * buffer.sampleRate), 
            buffer.sampleRate
        );
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        
        source.connect(ctx.destination);
        source.start();
        
        return await ctx.startRendering();
    }
};

export const reverseBuffer = (buffer: AudioBuffer): AudioBuffer => {
    const ctx = getAudioContext();
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    
    for(let c=0; c < buffer.numberOfChannels; c++) {
        const oldData = buffer.getChannelData(c);
        const newData = newBuffer.getChannelData(c);
        for(let i=0; i < newData.length; i++) {
            newData[i] = oldData[buffer.length - 1 - i];
        }
    }
    return newBuffer;
};

export const normalizeBuffer = (buffer: AudioBuffer): AudioBuffer => {
    let max = 0;
    for(let c=0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        for(let i=0; i < data.length; i++) {
            if(Math.abs(data[i]) > max) max = Math.abs(data[i]);
        }
    }
    
    if (max === 0) return buffer;
    const amp = 0.98 / max;
    
    const ctx = getAudioContext();
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    
    for(let c=0; c < buffer.numberOfChannels; c++) {
        const oldData = buffer.getChannelData(c);
        const newData = newBuffer.getChannelData(c);
        for(let i=0; i < newData.length; i++) {
            newData[i] = oldData[i] * amp;
        }
    }
    return newBuffer;
};

export const resampleBuffer = async (buffer: AudioBuffer, targetRate: number): Promise<AudioBuffer> => {
    if (buffer.sampleRate === targetRate) return buffer;
    
    const ctx = new OfflineAudioContext(
        buffer.numberOfChannels, 
        buffer.duration * targetRate, 
        targetRate
    );
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    return await ctx.startRendering();
};

export const applyEQ = async (buffer: AudioBuffer, preset: string): Promise<AudioBuffer> => {
    const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filters: BiquadFilterNode[] = [];

    const createFilter = (type: BiquadFilterType, freq: number, gain: number = 0, Q: number = 1) => {
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.gain.value = gain;
        f.Q.value = Q;
        return f;
    };

    switch (preset) {
        case 'Telephone':
            filters.push(createFilter('highpass', 400));
            filters.push(createFilter('lowpass', 3000));
            break;
        case 'Bass Boost':
            filters.push(createFilter('lowshelf', 100, 8));
            break;
        case 'Treble Boost':
            filters.push(createFilter('highshelf', 3000, 8));
            break;
        case 'Bass Cut':
            filters.push(createFilter('lowshelf', 100, -12));
            break;
        case 'Treble Cut':
            filters.push(createFilter('highshelf', 3000, -12));
            break;
        case 'Mid Boost':
            filters.push(createFilter('peaking', 1000, 6, 1));
            break;
        case 'V-Shape': 
            filters.push(createFilter('lowshelf', 100, 4));
            filters.push(createFilter('peaking', 1000, -6, 1));
            filters.push(createFilter('highshelf', 3000, 4));
            break;
        case 'Lo-Fi Radio':
            filters.push(createFilter('highpass', 200));
            filters.push(createFilter('lowpass', 2000));
            filters.push(createFilter('peaking', 1000, 10, 2)); 
            break;
        default:
            return buffer;
    }

    let currentNode: AudioNode = source;
    filters.forEach(f => {
        currentNode.connect(f);
        currentNode = f;
    });
    currentNode.connect(ctx.destination);

    source.start();
    return await ctx.startRendering();
};

export const removeVocals = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
    const channels = buffer.numberOfChannels;
    if (channels < 2) return buffer;

    const ctx = getAudioContext();
    const newBuffer = ctx.createBuffer(2, buffer.length, buffer.sampleRate);
    
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const newLeft = newBuffer.getChannelData(0);
    const newRight = newBuffer.getChannelData(1);
    
    for(let i=0; i < buffer.length; i++) {
        // Center cancellation: L - R
        const sample = (left[i] - right[i]);
        newLeft[i] = sample;
        newRight[i] = sample;
    }
    return newBuffer;
};

export const isolateVocals = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
    const channels = buffer.numberOfChannels;
    if (channels < 2) return buffer;

    const ctx = getAudioContext();
    const newBuffer = ctx.createBuffer(2, buffer.length, buffer.sampleRate);
    
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const newLeft = newBuffer.getChannelData(0);
    const newRight = newBuffer.getChannelData(1);
    
    for(let i=0; i < buffer.length; i++) {
        // Center isolation (approximation): (L + R) / 2
        const sample = (left[i] + right[i]) / 2;
        newLeft[i] = sample;
        newRight[i] = sample;
    }
    return newBuffer;
};

// --- Core Editing ---

export const trimBuffer = (buffer: AudioBuffer, start: number, end: number): AudioBuffer => {
    const ctx = getAudioContext();
    const rate = buffer.sampleRate;
    const startOffset = Math.floor(start * rate);
    const endOffset = Math.floor(end * rate);
    const frameCount = endOffset - startOffset;

    if (frameCount <= 0) return ctx.createBuffer(buffer.numberOfChannels, 1, rate);

    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, frameCount, rate);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        const chanData = buffer.getChannelData(i);
        const newChanData = newBuffer.getChannelData(i);
        if (startOffset >= 0 && startOffset < chanData.length) {
             const segment = chanData.slice(startOffset, startOffset + frameCount);
             newChanData.set(segment);
        }
    }
    return newBuffer;
};

export const splitBuffer = (buffer: AudioBuffer, splitTime: number): [AudioBuffer, AudioBuffer] | null => {
    if (splitTime <= 0 || splitTime >= buffer.duration) return null;
    
    const part1 = trimBuffer(buffer, 0, splitTime);
    const part2 = trimBuffer(buffer, splitTime, buffer.duration);
    
    return [part1, part2];
};

// --- Generation ---

export const generateDrumBeat = async (style: string, bpm: number, bars: number): Promise<AudioBuffer> => {
    const sr = DEFAULT_SAMPLE_RATE;
    const beats = BEAT_PATTERNS[style] || BEAT_PATTERNS['Metronome'];
    const beatLen = 60 / bpm;
    const stepLen = beatLen / 4;
    const totalDuration = bars * 4 * beatLen;
    
    const ctx = new OfflineAudioContext(2, Math.ceil(totalDuration * sr), sr);
    
    const pattern = beats[0];
    
    const createSound = (type: number, time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 1) { // Kick
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            gain.gain.setValueAtTime(1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
            osc.start(time);
            osc.stop(time + 0.5);
        } else if (type === 2) { // Snare
             osc.type = 'triangle';
             osc.frequency.setValueAtTime(100, time);
             gain.gain.setValueAtTime(0.8, time);
             gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
             osc.start(time);
             osc.stop(time + 0.2);
        } else if (type === 3) { // HiHat
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, time);
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 5000;
            osc.disconnect();
            osc.connect(filter);
            filter.connect(gain);
            
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            osc.start(time);
            osc.stop(time + 0.05);
        } else if (type === 4) { // Metro High
            osc.frequency.value = 1200;
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            osc.start(time);
            osc.stop(time + 0.1);
        } else if (type === 5) { // Metro Low
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            osc.start(time);
            osc.stop(time + 0.1);
        }
    };

    for (let b = 0; b < bars; b++) {
        for (let i = 0; i < 16; i++) {
            const soundType = pattern[i];
            if (soundType > 0) {
                const time = (b * 16 + i) * stepLen;
                createSound(soundType, time);
            }
        }
    }

    return await ctx.startRendering();
};

// --- Synth Generation (Virtual Analog) ---

const NOTES: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

const getScaleNotes = (root: string, octave: number, scale: 'Major' | 'Minor'): number[] => {
    const rootIndex = NOTES[root.toUpperCase()];
    const rootFreqBase = 261.63; // C4
    
    // Intervals
    const major = [0, 2, 4, 5, 7, 9, 11, 12];
    const minor = [0, 2, 3, 5, 7, 8, 10, 12];
    const intervals = scale === 'Major' ? major : minor;
    
    // Formula: freq = C4 * 2^((semitones_from_C4)/12)
    // Semitones from C4 = (Octave - 4)*12 + (NoteIndex - C_Index)
    
    return intervals.map(semitone => {
        const totalSemitones = (octave - 4) * 12 + rootIndex + semitone;
        return rootFreqBase * Math.pow(2, totalSemitones / 12);
    });
};

export const generateSynthSequence = async (
    preset: string, 
    patternType: string, 
    root: string, 
    scale: 'Major' | 'Minor', 
    bpm: number, 
    bars: number
): Promise<AudioBuffer> => {
    const sr = DEFAULT_SAMPLE_RATE;
    const beatLen = 60 / bpm;
    const totalDuration = bars * 4 * beatLen;
    
    // 2 Channels for stereo width effects
    const ctx = new OfflineAudioContext(2, Math.ceil(totalDuration * sr), sr);
    
    const notes = getScaleNotes(root, patternType === 'Bassline' ? 2 : 4, scale);
    
    const playNote = (freq: number, time: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        // Synth Patch Logic
        if (preset === 'Analog Bass') {
            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, time);
            filter.frequency.exponentialRampToValueAtTime(1500, time + 0.05);
            filter.frequency.exponentialRampToValueAtTime(100, time + duration);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.8, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
        } else if (preset === 'Chiptune Lead') {
            osc.type = 'square';
            filter.type = 'lowpass';
            filter.frequency.value = 12000;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
            gain.gain.setValueAtTime(0.5, time + duration - 0.05);
            gain.gain.linearRampToValueAtTime(0, time + duration);
            
        } else if (preset === 'Dreamy Pad') {
            osc.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.4, time + duration / 2);
            gain.gain.linearRampToValueAtTime(0, time + duration);
            // Add a detuned oscillator for chorus effect
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.value = freq * 1.01; // Detune
            osc2.connect(filter);
            osc2.start(time);
            osc2.stop(time + duration);
            
        } else if (preset === 'Pluck') {
            osc.type = 'triangle'; 
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3000, time);
            filter.frequency.exponentialRampToValueAtTime(200, time + 0.3);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.8, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        } else if (preset === 'Electric Piano') {
            osc.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.value = 3000;
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.7, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 1.5); // Long decay

            // FM Modulation for metallic tone
            const modOsc = ctx.createOscillator();
            modOsc.type = 'sine';
            modOsc.frequency.value = freq * 2;
            const modGain = ctx.createGain();
            modGain.gain.value = 500; // Modulation depth
            modOsc.connect(modGain);
            modGain.connect(osc.frequency);
            modOsc.start(time);
            modOsc.stop(time + duration);

        } else if (preset === 'Saw Lead') {
            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, time);
            filter.frequency.linearRampToValueAtTime(4000, time + 0.1); // Wah effect
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.5, time + 0.05);
            gain.gain.linearRampToValueAtTime(0, time + duration);

            const osc2 = ctx.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.value = freq * 1.005; // Slight detune
            osc2.connect(filter);
            osc2.start(time);
            osc2.stop(time + duration);

        } else if (preset === 'Strings') {
            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.value = 1500;
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.4, time + 0.3); // Slow attack
            gain.gain.linearRampToValueAtTime(0, time + duration + 0.2); // Slow release

        } else if (preset === 'Glitch Bass') {
            osc.type = 'square';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, time);
            // LFO for filter
            const lfo = ctx.createOscillator();
            lfo.type = 'square';
            lfo.frequency.value = 12; // Fast wob
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 600;
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start(time);
            lfo.stop(time + duration);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.8, time + 0.01);
            gain.gain.setValueAtTime(0.8, time + duration - 0.05);
            gain.gain.linearRampToValueAtTime(0, time + duration);
        }
        
        osc.frequency.value = freq;
        osc.start(time);
        osc.stop(time + duration);
    };
    
    // Pattern Logic
    if (patternType === 'One Shot') {
        playNote(notes[0], 0, 2); 
    } else if (patternType === 'Bassline') {
        const step = beatLen / 2; 
        const totalSteps = bars * 8;
        for(let i=0; i<totalSteps; i++) {
            if (Math.random() > 0.3) {
                const noteIdx = Math.floor(Math.random() * 3); 
                playNote(notes[noteIdx], i * step, step * 0.8);
            }
        }
    } else if (patternType === 'Arpeggio') {
        const step = beatLen / 4; 
        const totalSteps = bars * 16;
        for(let i=0; i<totalSteps; i++) {
            const noteIdx = i % 4; 
            const scaleIdx = [0, 2, 4, 7][noteIdx];
            if (scaleIdx < notes.length) {
                playNote(notes[scaleIdx], i * step, step * 0.5);
            }
        }
    } else if (patternType === 'Random Melody') {
        const step = beatLen / 2; 
        const totalSteps = bars * 8;
        let lastNote = 0;
        for(let i=0; i<totalSteps; i++) {
            if (Math.random() > 0.2) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                let nextNote = lastNote + dir;
                if (nextNote < 0) nextNote = 0;
                if (nextNote >= notes.length) nextNote = notes.length - 1;
                playNote(notes[nextNote], i * step, step * 0.9);
                lastNote = nextNote;
            }
        }
    } else if (patternType === 'Chords') {
        const step = beatLen * 2; 
        const totalSteps = bars * 2;
        for(let i=0; i<totalSteps; i++) {
            const progression = [0, 4, 5, 3]; 
            const rootIdx = progression[i % 4];
            playNote(notes[rootIdx], i * step, step);
            if (rootIdx + 2 < notes.length) playNote(notes[rootIdx + 2], i * step, step);
            if (rootIdx + 4 < notes.length) playNote(notes[rootIdx + 4], i * step, step);
        }
    }
    
    return await ctx.startRendering();
};

// --- Mixing ---

export const mixTracks = async (tracks: Track[], duration: number): Promise<AudioBuffer> => {
    // Dynamically choose sample rate based on tracks, defaulting to 44.1k but going up to max found
    const maxRate = tracks.length > 0 
        ? Math.max(...tracks.map(t => t.buffer.sampleRate)) 
        : DEFAULT_SAMPLE_RATE;
    
    const sampleRate = Math.max(DEFAULT_SAMPLE_RATE, maxRate);

    const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
    
    tracks.forEach(track => {
        if (track.isMuted) return;
        
        const source = ctx.createBufferSource();
        source.buffer = track.buffer;
        
        const gain = ctx.createGain();
        gain.gain.value = track.volume;
        
        // Apply Volume Automation curve if exists
        if (track.volumeAutomation && track.volumeAutomation.length > 0) {
            const points = [...track.volumeAutomation].sort((a, b) => a.time - b.time);
            gain.gain.setValueAtTime(points[0].value, Math.max(0, points[0].time + track.startTime));
            
            points.forEach((p, i) => {
                if (i > 0) {
                    const time = Math.max(0, p.time + track.startTime);
                    // Use linear ramp for automation
                    gain.gain.linearRampToValueAtTime(p.value, time);
                }
            });
        }

        source.connect(gain);
        gain.connect(ctx.destination);
        
        source.start(track.startTime, track.trimStart, track.duration);
    });
    
    return await ctx.startRendering();
};

export const encodeWAVBuffer = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; 
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;

  const length = buffer.length;
  const dataLength = length * numChannels * bytesPerSample;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
  }

  for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
          const sample = channels[ch][i];
          const s = Math.max(-1, Math.min(1, sample));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          offset += 2;
      }
  }

  return arrayBuffer;
};

export const encodeWAV = (buffer: AudioBuffer): Blob => {
  return new Blob([encodeWAVBuffer(buffer)], { type: 'audio/wav' });
};

// Placeholder for FLAC encoding using WAV logic for now as no library is available.
// In a real scenario, this would use libflac.js or MediaRecorder with audio/flac mime type.
export const encodeFLAC = (buffer: AudioBuffer): Blob => {
    // We wrap WAV data but label it differently for now. 
    // Ideally, integration with flac.js would happen here.
    return new Blob([encodeWAVBuffer(buffer)], { type: 'audio/flac' });
};

export const encodeMP3 = (buffer: AudioBuffer): Blob => {
    const lame = (window as any).lamejs;
    if (!lame) throw new Error("MP3 Encoder not loaded");

    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const kbps = 128;
    
    const mp3Encoder = new lame.Mp3Encoder(channels, sampleRate, kbps);

    const samplesL = buffer.getChannelData(0);
    const samplesR = channels > 1 ? buffer.getChannelData(1) : undefined;

    const convertToInt16 = (data: Float32Array) => {
        const result = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const s = Math.max(-1, Math.min(1, data[i]));
            result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return result;
    };

    const int16L = convertToInt16(samplesL);
    const int16R = samplesR ? convertToInt16(samplesR) : undefined;

    const mp3Data = [];
    
    const mp3buf = mp3Encoder.encodeBuffer(int16L, int16R);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    const flush = mp3Encoder.flush();
    if (flush.length > 0) mp3Data.push(flush);

    return new Blob(mp3Data, { type: 'audio/mp3' });
};
