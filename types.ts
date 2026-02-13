

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  EDITING = 'EDITING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
  LIBRARY = 'LIBRARY'
}

export enum ToolMode {
  SELECT = 'SELECT',
  MOVE = 'MOVE'
}

export interface AudioMetadata {
  name: string;
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface SelectionRange {
  start: number; // in seconds
  end: number;   // in seconds
}

export interface AutomationPoint {
    time: number; // Relative to track start (seconds)
    value: number; // 0.0 to 1.0 (gain)
}

export interface ActiveEffects {
    fadeIn?: number;
    fadeOut?: number;
    // Non-destructive states
    normalize?: boolean;
    reverse?: boolean;
    playbackRate?: number; // 1.0 is normal. <1 slow, >1 fast
    eqPreset?: string;
    preservePitch?: boolean; // For time-stretching
    vocalRemover?: boolean;
    vocalIsolator?: boolean;
}

export interface Track {
  id: string;
  name: string;
  buffer: AudioBuffer; // The CURRENT (potentially processed) buffer
  startTime: number; 
  trimStart: number; 
  duration: number; 
  lane: number; 
  volume: number; 
  isMuted: boolean;
  isSolo: boolean;
  color: string;
  bpm?: number; // Detected BPM
  isLooping?: boolean; // If true, allows infinite extension and loops playback
  
  // Non-destructive editing fields
  originalBuffer?: AudioBuffer; // The raw audio before effects
  activeEffects?: ActiveEffects;
  volumeAutomation?: AutomationPoint[]; // Array of points
  crossfadeMetadata?: {
      left: Track;  // The original left track
      right: Track; // The original right track
      duration: number;
  };
}

export type ExportFormat = 'wav' | 'mp3' | 'flac';

export interface ExportSettings {
  format: ExportFormat;
  sampleRate: number;
  channels: number;
}

export type BeatStyle = 'Rock' | 'HipHop' | 'Techno' | 'Metronome';

export interface EffectParams {
    duration?: number;
    preset?: string;
    playbackRate?: number; // For speed changes
    restore?: boolean; // Flag to trigger restoration (removal of effect)
    interactive?: boolean; // Flag to trigger slider mode
    automation?: boolean; // Flag to trigger automation mode
    preservePitch?: boolean; // Flag for time-stretching
    toggle?: boolean; // Flag to toggle boolean effects (reverse, normalize)
}

export interface TrimState {
    isDragging: boolean;
    side: 'start' | 'end';
    initialMouseX: number;
    initialStartTime: number;
    initialTrimStart: number;
    initialDuration: number;
    currentDelta: number; // Seconds
}

// Persistence Types
export interface SavedTrack {
    id: string;
    name: string;
    blob?: Blob; // Deprecated
    data?: ArrayBuffer; // Current audio data
    originalData?: ArrayBuffer; // Raw audio data for restore
    startTime: number;
    trimStart: number;
    duration: number;
    lane: number;
    volume: number;
    isMuted: boolean;
    isSolo: boolean;
    color: string;
    bpm?: number;
    isLooping?: boolean;
    activeEffects?: ActiveEffects;
    volumeAutomation?: AutomationPoint[];
    crossfadeMetadata?: {
        left: SavedTrack;
        right: SavedTrack;
        duration: number;
    };
}

export interface SavedProject {
    id: string;
    name: string;
    lastModified: number;
    tracks: SavedTrack[];
    thumbnail?: string; 
}