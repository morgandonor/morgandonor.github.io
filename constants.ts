
export const THEME_COLOR = '#06b6d4'; // Cyan-500
export const WAVEFORM_COLOR = '#22d3ee'; // Cyan-400
export const WAVEFORM_BG = '#18181b'; // Zinc-900
export const SELECTION_COLOR = 'rgba(6, 182, 212, 0.3)';
export const PLAYHEAD_COLOR = '#ef4444'; // Red-500

export const DEFAULT_SAMPLE_RATE = 44100;
export const MAX_ZOOM = 300; // pixels per second
export const MIN_ZOOM = 10; 
export const DEFAULT_ZOOM = 50;

export const DEFAULT_LANE_HEIGHT = 120; // Height of each track lane in pixels
export const MIN_LANE_HEIGHT = 60; // Minimum compacted height
export const SNAP_THRESHOLD_PX = 15; // Distance in pixels to trigger snapping

// Interaction Constants
export const LONG_PRESS_DURATION = 300; // ms to hold before drag starts
export const DRAG_THRESHOLD_PX = 15; // Increased to 15px to prevent accidental scroll detection during hold

// Extended Palette for Multi-layer visualization
export const TRACK_COLORS = [
  '#22d3ee', // Cyan-400
  '#818cf8', // Indigo-400
  '#e879f9', // Fuchsia-400
  '#f472b6', // Pink-400
  '#fb7185', // Rose-400
  '#34d399', // Emerald-400
  '#fbbf24', // Amber-400
  '#a78bfa', // Violet-400
  '#2dd4bf', // Teal-400
  '#60a5fa', // Blue-400
];

export const BEAT_PATTERNS: Record<string, number[][]> = {
    // 16 steps. 1 = Kick, 2 = Snare, 3 = HiHat
    'Rock':     [[1,0,3,0, 2,0,3,0, 1,0,3,1, 2,0,3,0]], 
    'HipHop':   [[1,0,3,0, 2,0,3,1, 0,1,3,0, 2,0,3,0]],
    'Techno':   [[1,3,0,3, 1,3,0,3, 1,3,0,3, 1,3,0,3]],
    'Metronome':[[4,0,0,0, 5,0,0,0, 5,0,0,0, 5,0,0,0]] // 4=High Tick, 5=Low Tick
};
