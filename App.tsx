import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import Button from './components/Button';
import BeatMakerModal from './components/BeatMakerModal';
import EffectsModal from './components/EffectsModal';
import ExportModal from './components/ExportModal';
import { Header } from './components/Header';
import { TransportControls } from './components/TransportControls';
import { Timeline } from './components/Timeline';
import { 
    getAudioContext, 
    decodeAudioData, 
    encodeWAV,
    encodeMP3,
    encodeFLAC,
    applyFade,
    mergeBuffers,
    changeSpeed,
    reverseBuffer,
    normalizeBuffer,
    resampleBuffer,
    applyEQ,
    mixTracks,
    generateProjectPreview,
    detectBPM,
    removeVocals,
    isolateVocals
} from './services/audioUtils';
import { saveProject, loadProjects, loadProjectTracks, deleteProject, updateProjectName } from './services/storageService';
import { AppState, SelectionRange, Track, EffectParams, TrimState, SavedProject, ExportFormat, ActiveEffects } from './types';
import { 
    DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, TRACK_COLORS, DEFAULT_LANE_HEIGHT, MIN_LANE_HEIGHT, SNAP_THRESHOLD_PX,
    LONG_PRESS_DURATION, DRAG_THRESHOLD_PX 
} from './constants';

// Icons
const LibraryIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const PencilIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const CheckIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const NewDocIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const LoadingSpinner = () => <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0.00s";
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(2);
    return `${m}m ${s}s`;
};

const App: React.FC = () => {
    // State
    const [tracks, setTracks] = useState<Track[]>([]);
    const [history, setHistory] = useState<Track[][]>([]);
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  
    const [isPlaying, setIsPlaying] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const [currentTime, setCurrentTime] = useState(0);
    const [selection, setSelection] = useState<SelectionRange | null>(null);
  
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [laneHeight, setLaneHeight] = useState(DEFAULT_LANE_HEIGHT);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
    const [isBeatModalOpen, setBeatModalOpen] = useState(false);
    const [isEffectsModalOpen, setEffectsModalOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);

    // Persistence
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [currentProjectName, setCurrentProjectName] = useState<string>("");
    const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
    const [recentProjectPreview, setRecentProjectPreview] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
    // Guard to prevent autosave overwrites during loading
    const ignoreChangesRef = useRef(false);
    const isDirtyRef = useRef(false);

    // Inline Renaming State
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    // Viewport Tracking
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

    // New Modes
    const [isTrimMode, setIsTrimMode] = useState(false);
    const [trimState, setTrimState] = useState<TrimState | null>(null);
  
    // Interactive Fade Mode
    const [interactiveMode, setInteractiveMode] = useState<{ type: 'fadeIn' | 'fadeOut' | 'automation', trackId: string, isDragging: boolean } | null>(null);

    // Dragging State
    const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    const dragRef = useRef<{
        startX: number;
        startY: number;
        offsetTime: number; 
        trackId: string;
        lastPointerX: number;
        lastPointerY: number;
        isTimelineTap: boolean;
        timelineStartX: number;
        targetElement: HTMLElement | null;
        pointerId: number;
        automationIndex: number;
    }>({ 
        startX: 0, startY: 0, offsetTime: 0, trackId: '', lastPointerX: 0, lastPointerY: 0,
        isTimelineTap: false, timelineStartX: 0, targetElement: null, pointerId: -1,
        automationIndex: -1
    });

    const lastDragPos = useRef<{x: number, y: number} | null>(null);
    const autoScrollRef = useRef<{ vx: number, vy: number }>({ vx: 0, vy: 0 });

    // Pinch Zoom Refs
    const activePointers = useRef<Map<number, {x: number, y: number}>>(new Map());
    const [isZooming, setIsZooming] = useState(false); // Track zooming state to lock scroll
    
    const pinchState = useRef<{
        mode: 'horizontal' | 'vertical' | null;
        startDist: number;
        startDistX: number;
        startDistY: number;
        startZoom: number;
        startLaneHeight: number;
        isLocked: boolean;
    }>({ mode: null, startDist: 0, startDistX: 0, startDistY: 0, startZoom: 0, startLaneHeight: 0, isLocked: false });
    
    const pendingScrollRef = useRef<number | null>(null);

    // Refs
    const audioSourceNodes = useRef<AudioBufferSourceNode[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const startTimeRef = useRef<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const playheadRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Tracks Ref for Event Handlers
    const tracksRef = useRef<Track[]>(tracks);
    useEffect(() => { tracksRef.current = tracks; }, [tracks]);

    const updateTrack = (id: string, updates: Partial<Track>) => {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    // Calculate max sample rate from tracks for export (or default 44100)
    const projectSampleRate = React.useMemo(() => {
        if (tracks.length === 0) return 44100;
        return Math.max(...tracks.map(t => t.buffer.sampleRate));
    }, [tracks]);

    // Keep Playhead Centered on Zoom
    useLayoutEffect(() => {
        if (timelineRef.current) {
            const rect = timelineRef.current.getBoundingClientRect();
            const viewportW = rect.width;
            
            // Calculate center scroll based on Playhead Time
            const targetScroll = (currentTime * zoom) - (viewportW / 2);
            timelineRef.current.scrollLeft = Math.max(0, targetScroll);
        }
    }, [zoom]); // Only when zoom changes (not currentTime, to avoid fighting scroll during playback)

    // Auto Scroll Loop
    useEffect(() => {
        let frameId: number;
        const scrollLoop = () => {
            if (draggingTrackId && timelineRef.current && (autoScrollRef.current.vx !== 0 || autoScrollRef.current.vy !== 0)) {
                timelineRef.current.scrollLeft += autoScrollRef.current.vx;
                timelineRef.current.scrollTop += autoScrollRef.current.vy;
                
                // If auto-scrolling, force update track position based on last known pointer pos
                if (lastDragPos.current) {
                    processTrackDrag(lastDragPos.current.x, lastDragPos.current.y, draggingTrackId);
                }
            }
            frameId = requestAnimationFrame(scrollLoop);
        };
        frameId = requestAnimationFrame(scrollLoop);
        return () => cancelAnimationFrame(frameId);
    }, [draggingTrackId, zoom, laneHeight]);

    // Derived State: Smart Selection
    const effectiveSelectedTrackId = selectedTrackId || (() => {
        const atPlayhead = tracks.filter(t => 
            currentTime >= t.startTime && currentTime < t.startTime + t.duration
        );
        return atPlayhead.length === 1 ? atPlayhead[0].id : null;
    })();

    const selectedTrack = tracks.find(t => t.id === effectiveSelectedTrackId);

    // Calculate maxDuration and layout metrics
    const maxDuration = tracks.length > 0 ? Math.max(...tracks.map(t => t.startTime + t.duration)) : 0;
    const maxLane = tracks.length > 0 ? Math.max(...tracks.map(t => t.lane)) : 0;
    const totalLanes = maxLane + 2; 

    // Determine Project BPM (from first track or default)
    const projectBpm = tracks.find(t => t.bpm)?.bpm || 120;
    const beatDuration = 60 / projectBpm;

    // Calculate dynamic minimum zoom to fit entire project
    const minZoom = React.useMemo(() => {
        if (maxDuration <= 0) return MIN_ZOOM;
        const fitZoom = viewportWidth / maxDuration;
        return Math.min(MIN_ZOOM, fitZoom); 
    }, [maxDuration, viewportWidth]);

    // Sticky Auto-Zoom Logic
    const prevMinZoomRef = useRef(minZoom);
    
    useLayoutEffect(() => {
        const prevMin = prevMinZoomRef.current;
        const currentMin = minZoom;
        const isAtMin = Math.abs(zoom - prevMin) < (prevMin * 0.01) || zoom < prevMin;
        if (zoom < currentMin) {
            setZoom(currentMin);
        } else if (isAtMin && currentMin < prevMin) {
            setZoom(currentMin);
        }
        prevMinZoomRef.current = currentMin;
    }, [minZoom, zoom]);

    // Viewport Resize Observer
    useEffect(() => {
        if (timelineRef.current) {
            setViewportWidth(timelineRef.current.clientWidth);
        }
        const observer = new ResizeObserver(entries => {
            for(let entry of entries) {
                setViewportWidth(entry.contentRect.width);
            }
        });
        if (timelineRef.current) observer.observe(timelineRef.current);
        return () => observer.disconnect();
    }, []);

    // --- REFINED ZOOM HANDLERS ---

    const performZoom = useCallback((newZoom: number) => {
        const safeZoom = Math.min(MAX_ZOOM, Math.max(minZoom, newZoom));
        if (Math.abs(safeZoom - zoom) < 0.001) return;
        
        // Auto-clamp Playhead if beyond tracks on Zoom
        if (maxDuration > 0 && currentTime > maxDuration) {
            setCurrentTime(maxDuration);
        }

        setZoom(safeZoom);
    }, [zoom, minZoom, currentTime, maxDuration]);

    const performVerticalZoom = useCallback((deltaY: number, startHeight: number) => {
        if (!timelineRef.current) return;
        
        const containerH = timelineRef.current.clientHeight;
        const sensitivity = 0.5; 
        let newHeight = startHeight + deltaY * sensitivity;
        
        // Clamp
        const maxH = containerH; // At least one track fits
        const minH = MIN_LANE_HEIGHT;
        newHeight = Math.max(minH, Math.min(newHeight, maxH));

        // Smart Snap: If close to showing integer number of tracks, snap to it.
        // We calculate target heights that fit 1, 2, 3... N tracks perfectly.
        const maxTracks = Math.floor(containerH / minH);
        let snapped = newHeight;
        let isSnapped = false;

        for (let i = 1; i <= maxTracks; i++) {
            const targetH = containerH / i;
            // Tolerance increases for smaller track counts (easier to snap to 1 or 2 tracks)
            const tolerance = 25; 
            if (Math.abs(newHeight - targetH) < tolerance) {
                snapped = targetH;
                isSnapped = true;
                break;
            }
        }

        if (isSnapped) newHeight = snapped;
        setLaneHeight(newHeight);
    }, []);

    // --- GLOBAL ZOOM HANDLER (Mouse + Trackpad + Safari Gesture) ---
    const zoomRef = useRef(zoom);
    const laneHeightRef = useRef(laneHeight);
    
    // Keep refs synced
    useLayoutEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useLayoutEffect(() => { laneHeightRef.current = laneHeight; }, [laneHeight]);

    // Use a Ref for performZoom to ensure event listeners always call the latest version with fresh closure values
    const performZoomRef = useRef(performZoom);
    useLayoutEffect(() => { performZoomRef.current = performZoom; }, [performZoom]);

    useEffect(() => {
        const handleGlobalWheel = (e: WheelEvent) => {
            // Trackpad Pinch typically fires Wheel with ctrlKey on Chrome/Edge
            // Mouse Wheel Zoom typically requires Ctrl
            
            if (e.ctrlKey && !e.metaKey) { 
                e.preventDefault();
                
                const currentZoom = zoomRef.current;
                const currentLaneHeight = laneHeightRef.current;
                
                // Trackpads: deltaMode 0 (Pixel), small deltaY.
                // Mice: deltaMode 1 (Line), large deltaY.
                const isTrackpad = e.deltaMode === 0;
                
                // Horizontal Pinch (Timeline) is default behavior
                // Vertical Pinch? Browsers don't distinct well. 
                // We'll support Shift+Pinch for Vertical Layer Zoom
                if (e.shiftKey) {
                    // Vertical Zoom (Layers)
                    const delta = -e.deltaY;
                    const speed = isTrackpad ? 3.0 : 0.5; 
                    performVerticalZoom(-delta * speed, currentLaneHeight); // Invert delta for intuitive expand
                } else {
                    // Horizontal Zoom (Timeline)
                    const delta = -e.deltaY;
                    const factor = isTrackpad ? 0.015 : 0.001; 
                    
                    // Multiplicative Zoom for smooth feel
                    const scale = 1 + (delta * factor);
                    const newZoom = currentZoom * scale;
                    performZoomRef.current(newZoom);
                }
            } else if (e.altKey) {
                 // Classic Desktop DAW Vertical Zoom (Alt + Scroll)
                 e.preventDefault();
                 const currentLaneHeight = laneHeightRef.current;
                 const delta = e.deltaY;
                 const speed = e.deltaMode === 1 ? 0.5 : 2.0;
                 performVerticalZoom(delta * speed, currentLaneHeight);
            }
        };
        
        // Safari Gesture Support (Mac Trackpad native pinch)
        const handleGestureStart = (e: any) => {
            e.preventDefault();
            pinchState.current.startZoom = zoomRef.current;
            pinchState.current.startLaneHeight = laneHeightRef.current;
        };

        const handleGestureChange = (e: any) => {
            e.preventDefault();
            const scale = e.scale;
            
            if (e.shiftKey) {
                // Vertical Zoom on Mac Trackpad + Shift
                const startH = pinchState.current.startLaneHeight;
                // Heuristic: map scale to additive height
                const delta = (scale - 1) * 200; 
                performVerticalZoom(delta, startH);
            } else {
                // Standard Pinch -> Timeline Zoom
                const startZ = pinchState.current.startZoom;
                const newZ = startZ * scale;
                performZoomRef.current(newZ);
            }
        };

        const preventGesture = (e: Event) => e.preventDefault();

        window.addEventListener('wheel', handleGlobalWheel, { passive: false });
        
        // Non-standard Safari events need cast or ignore TS error
        // @ts-ignore
        window.addEventListener('gesturestart', handleGestureStart);
        // @ts-ignore
        window.addEventListener('gesturechange', handleGestureChange);
        // @ts-ignore
        window.addEventListener('gestureend', preventGesture);

        return () => {
            window.removeEventListener('wheel', handleGlobalWheel);
            // @ts-ignore
            window.removeEventListener('gesturestart', handleGestureStart);
            // @ts-ignore
            window.removeEventListener('gesturechange', handleGestureChange);
            // @ts-ignore
            window.removeEventListener('gestureend', preventGesture);
        };
    }, []); // Empty dep array: stable listener

    // Helper: Smart Insertion Point Logic
    const getSmartInsertionPoint = (newDuration: number): { lane: number, startTime: number } => {
        const defaultLane = tracks.length > 0 ? Math.max(...tracks.map(t => t.lane)) + 1 : 0;
        const fallback = { lane: defaultLane, startTime: currentTime };

        // 1. Is a track selected?
        if (!effectiveSelectedTrackId) return fallback;
        const selected = tracks.find(t => t.id === effectiveSelectedTrackId);
        if (!selected) return fallback;

        const threshold = 0.1; // 100ms tolerance for "at start/end"

        // 2. Check "At End" -> Append
        if (Math.abs(currentTime - (selected.startTime + selected.duration)) < threshold) {
            const proposedStart = selected.startTime + selected.duration;
            const proposedEnd = proposedStart + newDuration;
            
            const hasCollision = tracks.some(t => 
                t.lane === selected.lane && 
                t.id !== selected.id &&
                t.startTime < proposedEnd && 
                (t.startTime + t.duration) > proposedStart
            );

            if (!hasCollision) {
                return { lane: selected.lane, startTime: proposedStart };
            }
        }

        // 3. Check "At Start" -> Prepend
        if (Math.abs(currentTime - selected.startTime) < threshold) {
            const proposedStart = selected.startTime - newDuration;
            const proposedEnd = selected.startTime;

            if (proposedStart >= 0) {
                const hasCollision = tracks.some(t => 
                    t.lane === selected.lane && 
                    t.id !== selected.id &&
                    t.startTime < proposedEnd && 
                    (t.startTime + t.duration) > proposedStart
                );

                if (!hasCollision) {
                    return { lane: selected.lane, startTime: proposedStart };
                }
            }
        }

        return fallback;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setAppState(AppState.LOADING);
        pushHistory();
        try {
            const newTracks: Track[] = [];
            let baseInsertion: { lane: number, startTime: number } | null = null;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const arrayBuffer = await file.arrayBuffer();
                const decoded = await decodeAudioData(arrayBuffer);
                
                if (i === 0) {
                    baseInsertion = getSmartInsertionPoint(decoded.duration);
                }

                let trackName = file.name.substring(0, 15);
                let detectedBpm: number | undefined = undefined;
                try {
                    const bpm = await detectBPM(decoded);
                    if (bpm > 0) { detectedBpm = bpm; trackName = `${trackName} (${bpm} BPM)`; }
                } catch (bpmErr) {}
                
                const targetLane = baseInsertion ? baseInsertion.lane + i : (tracks.length > 0 ? Math.max(...tracks.map(t => t.lane)) + 1 + i : i);
                const targetTime = baseInsertion ? baseInsertion.startTime : currentTime;

                newTracks.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: trackName,
                    buffer: decoded,
                    startTime: targetTime, trimStart: 0,
                    duration: decoded.duration,
                    lane: targetLane,
                    volume: 1.0, isMuted: false, isSolo: false,
                    color: TRACK_COLORS[targetLane % TRACK_COLORS.length],
                    bpm: detectedBpm
                });
            }
            setTracks(prev => [...prev, ...newTracks]);
            if(newTracks.length > 0) { setSelectedTrackId(newTracks[newTracks.length-1].id); setIsTrimMode(false); }
            setAppState(AppState.EDITING);
        } catch (err) { console.error(err); setAppState(AppState.ERROR); }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const pushHistory = () => {
        setHistory(prev => {
            const newHistory = [...prev, tracks];
            if (newHistory.length > 20) newHistory.shift(); 
            return newHistory;
        });
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const prevTracks = history[history.length - 1];
        setTracks(prevTracks);
        setHistory(prev => prev.slice(0, -1));
        stopPlayback();
        setIsTrimMode(false);
        setTrimState(null);
        setInteractiveMode(null);
    };

    const stopPlayback = useCallback(() => {
        audioSourceNodes.current.forEach(node => { try { node.stop(); } catch(e){} });
        audioSourceNodes.current = [];
        setIsPlaying(false);
    }, []);

    // --- PLAYBACK LOOP ---
    useEffect(() => {
        if (!isPlaying || isScrubbing) return;
        let animationFrameId: number;
        const ctx = getAudioContext();
        const loop = () => {
            const elapsed = ctx.currentTime - startTimeRef.current;
            setCurrentTime(elapsed);
            
            if (timelineRef.current) {
                const playheadX = elapsed * zoom;
                const containerW = timelineRef.current.clientWidth;
                const halfScreen = containerW / 2;

                if (playheadX > halfScreen) {
                    timelineRef.current.scrollLeft = playheadX - halfScreen;
                } else {
                    timelineRef.current.scrollLeft = 0;
                }
            }

            if (elapsed >= maxDuration && !isRecording) { 
                stopPlayback(); 
                setCurrentTime(0); 
                if(timelineRef.current) timelineRef.current.scrollLeft = 0;
            } 
            else { 
                animationFrameId = requestAnimationFrame(loop); 
            }
        };
        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, isScrubbing, maxDuration, zoom, stopPlayback, isRecording]);

    const handlePlayPause = async () => {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        if (isPlaying) {
          stopPlayback();
        } else {
          stopPlayback();
          const now = ctx.currentTime;
          startTimeRef.current = now - currentTime;
          tracks.forEach(track => {
              if (track.isMuted) return;
              const trackStart = track.startTime;
              if (currentTime > trackStart + track.duration) return;
              
              let startOffset = 0;
              let scheduleTime = 0;
              
              if (currentTime < trackStart) { 
                  scheduleTime = now + (trackStart - currentTime); 
                  startOffset = 0; 
              } else { 
                  scheduleTime = now; 
                  startOffset = currentTime - trackStart; 
              }
              
              const source = ctx.createBufferSource();
              source.buffer = track.buffer;
              
              // Handle Looping
              if (track.isLooping) {
                  source.loop = true;
                  source.loopStart = 0;
                  source.loopEnd = track.buffer.duration;
              }
              
              const gain = ctx.createGain();
              gain.gain.value = track.volume;

              // Apply Automation Curve
              if (track.volumeAutomation && track.volumeAutomation.length > 0) {
                  const points = [...track.volumeAutomation].sort((a, b) => a.time - b.time);
                  gain.gain.setValueAtTime(points[0].value, Math.max(0, scheduleTime + points[0].time));
                  points.forEach((p, i) => {
                      if (i > 0) {
                          const pointTime = scheduleTime + p.time;
                          if (pointTime >= now) {
                              gain.gain.linearRampToValueAtTime(p.value, pointTime);
                          }
                      }
                  });
              }

              source.connect(gain);
              gain.connect(ctx.destination);
              
              if (startOffset >= 0 && (startOffset < track.duration || track.isLooping)) {
                  const bufferOffset = (track.trimStart + startOffset) % track.buffer.duration;
                  const durationToPlay = track.duration - startOffset;
                  if (durationToPlay > 0) {
                      source.start(scheduleTime, bufferOffset, track.isLooping ? durationToPlay : Math.min(durationToPlay, track.buffer.duration - track.trimStart));
                      audioSourceNodes.current.push(source);
                  }
              }
          });
          setIsPlaying(true);
        }
    };

    const handleToggleRecord = async () => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            stopPlayback(); 
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                const chunks: Blob[] = [];
                const recordStartTime = currentTime;

                mediaRecorder.ondataavailable = (e) => {
                    chunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioContext = getAudioContext();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    const lane = tracksRef.current.length > 0 ? Math.max(...tracksRef.current.map(t => t.lane)) + 1 : 0;

                    const newTrack: Track = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: `Recording ${tracksRef.current.length + 1}`,
                        buffer: audioBuffer,
                        startTime: recordStartTime,
                        trimStart: 0,
                        duration: audioBuffer.duration,
                        lane: lane,
                        volume: 1.0,
                        isMuted: false,
                        isSolo: false,
                        color: TRACK_COLORS[lane % TRACK_COLORS.length]
                    };
                    
                    pushHistory();
                    setTracks(prev => [...prev, newTrack]);
                    setSelectedTrackId(newTrack.id);
                };

                mediaRecorder.start();
                setIsRecording(true);
                
                if (!isPlaying) {
                    handlePlayPause();
                }

            } catch (err) {
                console.error("Error accessing microphone:", err);
                alert("Could not access microphone.");
            }
        }
    };

    // --- Interaction Handlers ---
    const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // No-op for now unless we track scrolling for other features
    };

    const updatePlayhead = (clientX: number) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left + timelineRef.current.scrollLeft;
        let newTime = Math.max(0, relativeX / zoom);
        const snapSeconds = SNAP_THRESHOLD_PX / zoom;
        let closestSnapTime = -1; let minDiff = Infinity;
        if (newTime < snapSeconds) { closestSnapTime = 0; minDiff = newTime; }
        tracks.forEach(t => {
            const start = t.startTime; const end = t.startTime + t.duration;
            const diffStart = Math.abs(newTime - start);
            if (diffStart < snapSeconds && diffStart < minDiff) { closestSnapTime = start; minDiff = diffStart; }
            const diffEnd = Math.abs(newTime - end);
            if (diffEnd < snapSeconds && diffEnd < minDiff) { closestSnapTime = end; minDiff = diffEnd; }
        });
        if (closestSnapTime !== -1) { 
            if (Math.abs(newTime - closestSnapTime) > 0.001 && navigator.vibrate) navigator.vibrate(5); 
            newTime = closestSnapTime; 
        }
        setCurrentTime(newTime);
    };
    
    const handlePlayheadPointerDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); setIsScrubbing(true); stopPlayback(); (e.target as HTMLElement).setPointerCapture(e.pointerId); };
    const handlePlayheadPointerMove = (e: React.PointerEvent) => { if (!isScrubbing) return; e.preventDefault(); e.stopPropagation(); updatePlayhead(e.clientX); };
    const handlePlayheadPointerUp = (e: React.PointerEvent) => { if (isScrubbing) { setIsScrubbing(false); if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) { e.target.releasePointerCapture(e.pointerId); } } };
    
    const handleTimelinePointerDown = (e: React.PointerEvent) => { 
        if ((e.target as HTMLElement).closest('.track-clip')) return; 
        if ((e.target as HTMLElement).closest('.fade-handle')) return; 
        
        if (activePointers.current.size > 1) return;

        if (isPlaying) stopPlayback(); 
        setSelectedTrackId(null); 
        setIsTrimMode(false); 
        
        dragRef.current.isTimelineTap = true;
        dragRef.current.timelineStartX = e.clientX;
    };

    // --- Track Dragging Logic ---
    const handleTrackPointerDown = (e: React.PointerEvent, track: Track) => {
        if (activePointers.current.size > 1) return;

        e.stopPropagation();
        
        // Automation Mode Logic
        if (interactiveMode?.type === 'automation' && interactiveMode.trackId === track.id) {
            e.preventDefault();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;
            
            const trackH = laneHeight - 20; 
            const HIT_RADIUS = 25; // Good size for touch
            
            let bestDist = Infinity;
            let bestIndex = -1;

            if (track.volumeAutomation) {
                track.volumeAutomation.forEach((p, idx) => {
                    const px = (p.time - track.trimStart) * zoom;
                    const py = (1 - p.value) * trackH;
                    const dist = Math.hypot(px - relativeX, py - relativeY);
                    
                    if (dist < HIT_RADIUS && dist < bestDist) {
                        bestDist = dist;
                        bestIndex = idx;
                    }
                });
            }

            if (bestIndex !== -1) {
                setInteractiveMode(prev => prev ? ({ ...prev, isDragging: true }) : null);
                dragRef.current.automationIndex = bestIndex;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
            } else {
                const time = Math.max(track.trimStart, Math.min(track.trimStart + track.duration, relativeX / zoom + track.trimStart));
                const value = 1 - Math.max(0, Math.min(1, relativeY / trackH));
                
                const newPoint = { time, value };
                const newPoints = track.volumeAutomation ? [...track.volumeAutomation, newPoint] : [newPoint];
                
                updateTrack(track.id, { volumeAutomation: newPoints });
                setInteractiveMode(prev => prev ? ({ ...prev, isDragging: true }) : null);
                dragRef.current.automationIndex = newPoints.length - 1;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }
            return;
        }

        if (isTrimMode) {
             if (effectiveSelectedTrackId !== track.id) setSelectedTrackId(track.id);
             return;
        }
        
        if (interactiveMode) {
             if (effectiveSelectedTrackId !== track.id) {
                 setSelectedTrackId(track.id);
                 setInteractiveMode(null);
             }
             return;
        }

        if (isPlaying) stopPlayback();
        
        const rect = timelineRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const mouseTime = ((e.clientX - rect.left) + (timelineRef.current?.scrollLeft || 0)) / zoom;
        const timeOffset = mouseTime - track.startTime;
        const targetElement = e.currentTarget as HTMLElement;
        
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            offsetTime: timeOffset,
            trackId: track.id,
            lastPointerX: e.clientX,
            lastPointerY: e.clientY,
            isTimelineTap: false,
            timelineStartX: 0,
            targetElement: targetElement,
            pointerId: e.pointerId,
            automationIndex: -1
        };

        // Delay setting draggingTrackId to detect intent (Drag vs Scroll)
        longPressTimerRef.current = setTimeout(() => {
            // CRITICAL: Capture pointer NOW to lock drag and disable scroll
            if (targetElement) {
                try {
                    targetElement.setPointerCapture(e.pointerId);
                } catch(err) { console.warn("Could not capture pointer", err); }
            }

            setDraggingTrackId(track.id);
            setSelectedTrackId(track.id); 
            if (navigator.vibrate) navigator.vibrate(10); 
        }, LONG_PRESS_DURATION);
    };

    const processTrackDrag = (clientX: number, clientY: number, activeTrackId: string) => {
        if (!timelineRef.current) return;
        const track = tracksRef.current.find(t => t.id === activeTrackId);
        if (!track) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const scrollL = timelineRef.current.scrollLeft;
        const mouseX = clientX - rect.left + scrollL;
        const mouseY = clientY - rect.top + timelineRef.current.scrollTop;

        let targetLane = Math.max(0, Math.floor((mouseY - 10) / laneHeight));

        const currentMouseTime = Math.max(0, mouseX / zoom);
        let proposedStartTime = currentMouseTime - dragRef.current.offsetTime;

        const laneTracks = tracksRef.current.filter(t => t.lane === targetLane && t.id !== activeTrackId);
        laneTracks.sort((a, b) => a.startTime - b.startTime);

        const gaps: {start: number, end: number}[] = [];
        let lastEnd = 0;
        laneTracks.forEach(t => {
            if (t.startTime > lastEnd) {
                gaps.push({ start: lastEnd, end: t.startTime });
            }
            lastEnd = t.startTime + t.duration;
        });
        gaps.push({ start: lastEnd, end: Infinity }); 

        let bestStartTime = -1;
        let minDisplacement = Infinity;

        gaps.forEach(gap => {
            const gapSize = gap.end - gap.start;
            if (gapSize < track.duration - 0.01) return; 

            const validStart = gap.start;
            const validEnd = gap.end - track.duration;

            const clampedStart = Math.max(validStart, Math.min(proposedStartTime, validEnd));
            const diff = Math.abs(clampedStart - proposedStartTime);

            if (diff < minDisplacement) {
                minDisplacement = diff;
                bestStartTime = clampedStart;
            }
        });

        if (bestStartTime === -1) return;

        proposedStartTime = bestStartTime;

        // Snapping
        const snapSeconds = SNAP_THRESHOLD_PX / zoom;
        let bestSnap = -1;
        let minDiff = Infinity;

        const candidates = [0, currentTime]; 
        
        gaps.forEach(gap => {
            candidates.push(gap.start); 
            if (gap.end !== Infinity) candidates.push(gap.end - track.duration);
        });
        
        tracksRef.current.forEach(other => {
            if (other.id === activeTrackId) return;
            if (Math.abs(other.lane - targetLane) === 1) { 
                candidates.push(other.startTime);
                candidates.push(other.startTime + other.duration);
            }
        });

        const SNAP_ZOOM_THRESHOLD = MIN_ZOOM + (MAX_ZOOM - MIN_ZOOM) * 0.25;
        if (zoom > SNAP_ZOOM_THRESHOLD) {
             const closestBeat = Math.round(proposedStartTime / beatDuration) * beatDuration;
             candidates.push(closestBeat);
        }

        candidates.forEach(cand => {
            const diffStart = Math.abs(proposedStartTime - cand);
            if (diffStart < snapSeconds && diffStart < minDiff) {
                const fits = gaps.some(g => {
                    const validStart = g.start;
                    const validEnd = g.end - track.duration;
                    return cand >= validStart - 0.001 && cand <= validEnd + 0.001 && (g.end - g.start >= track.duration - 0.01);
                });

                if (fits) {
                    bestSnap = cand;
                    minDiff = diffStart;
                }
            }

            const proposedEndTime = proposedStartTime + track.duration;
            const diffEnd = Math.abs(proposedEndTime - cand);
            if (diffEnd < snapSeconds && diffEnd < minDiff) {
                const alignedStart = cand - track.duration;
                const fits = gaps.some(g => {
                    const validStart = g.start;
                    const validEnd = g.end - track.duration;
                    return alignedStart >= validStart - 0.001 && alignedStart <= validEnd + 0.001 && (g.end - g.start >= track.duration - 0.01);
                });

                if (fits) {
                    bestSnap = alignedStart;
                    minDiff = diffEnd;
                }
            }
        });

        if (bestSnap !== -1) {
            proposedStartTime = bestSnap;
        }

        updateTrack(activeTrackId, { startTime: proposedStartTime, lane: targetLane });
    };

    const handleTrackDragMove = (e: React.PointerEvent) => {
        if (interactiveMode?.type === 'automation' && interactiveMode.isDragging) {
            const track = tracks.find(t => t.id === interactiveMode.trackId);
            if (track) {
                e.preventDefault();
                if (!timelineRef.current) return;
                const timelineRect = timelineRef.current.getBoundingClientRect();
                const absoluteX = e.clientX - timelineRect.left + timelineRef.current.scrollLeft;
                const absoluteTime = absoluteX / zoom;
                const relTime = absoluteTime - track.startTime;
                const time = Math.max(track.trimStart, Math.min(track.trimStart + track.duration, relTime + track.trimStart));

                const absoluteY = e.clientY - timelineRect.top + timelineRef.current.scrollTop;
                const trackTop = track.lane * laneHeight + 10;
                const trackHeight = laneHeight - 20;
                
                const relativeY = absoluteY - trackTop;
                const value = Math.max(0, Math.min(1, 1 - (relativeY / trackHeight)));

                const points = [...(track.volumeAutomation || [])];
                if (dragRef.current.automationIndex !== -1 && points[dragRef.current.automationIndex]) {
                    points[dragRef.current.automationIndex] = { time, value };
                    updateTrack(track.id, { volumeAutomation: points });
                }
            }
            return;
        }

        if (activePointers.current.size > 1) {
            if (draggingTrackId) setDraggingTrackId(null);
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            return;
        }

        if (!draggingTrackId && longPressTimerRef.current) {
             const dist = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
             if (dist > DRAG_THRESHOLD_PX) {
                 clearTimeout(longPressTimerRef.current);
                 longPressTimerRef.current = null;
                 return; // Allow native scroll
             }
        }

        if (!draggingTrackId || !timelineRef.current) return;
        
        e.preventDefault();

        lastDragPos.current = { x: e.clientX, y: e.clientY };

        const edgeThreshold = 75;
        const rect = timelineRef.current.getBoundingClientRect();
        let vx = 0;
        let vy = 0;

        if (e.clientX < rect.left + edgeThreshold) vx = -15;
        else if (e.clientX > rect.right - edgeThreshold) vx = 15;

        if (e.clientY < rect.top + edgeThreshold) vy = -10;
        else if (e.clientY > rect.bottom - edgeThreshold) vy = 10;

        autoScrollRef.current = { vx, vy };

        processTrackDrag(e.clientX, e.clientY, draggingTrackId);
    };

    const handleTrackPointerUp = (e: React.PointerEvent, track: Track) => {
        if (interactiveMode?.type === 'automation' && interactiveMode.isDragging) {
            setInteractiveMode(prev => prev ? ({ ...prev, isDragging: false }) : null);
            pushHistory();
            if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) {
                e.target.releasePointerCapture(e.pointerId);
            }
            return;
        }

        autoScrollRef.current = { vx: 0, vy: 0 };
        
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            setSelectedTrackId(track.id);
        }

        if (draggingTrackId) {
            setDraggingTrackId(null);
            pushHistory();
            if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) {
                e.target.releasePointerCapture(e.pointerId);
            }
        }
    };

    const handleTrackPointerCancel = (e: React.PointerEvent) => {
        autoScrollRef.current = { vx: 0, vy: 0 };
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (draggingTrackId) {
            setDraggingTrackId(null);
        }
    };

    // --- Trim Logic ---
    const handleTrimPointerDown = (e: React.PointerEvent, track: Track, side: 'start' | 'end') => {
        if (activePointers.current.size > 1) return;
        e.preventDefault(); e.stopPropagation();
        setTrimState({
            isDragging: true, side,
            initialMouseX: e.clientX,
            initialStartTime: track.startTime,
            initialTrimStart: track.trimStart,
            initialDuration: track.duration,
            currentDelta: 0
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleTrimPointerMove = (e: React.PointerEvent) => {
        if (activePointers.current.size > 1) { setTrimState(null); return; }
        if (!trimState?.isDragging) return;
        e.preventDefault();
        
        const deltaPx = e.clientX - trimState.initialMouseX;
        let deltaSec = deltaPx / zoom;

        const track = tracks.find(t => t.id === effectiveSelectedTrackId);
        if (track) {
            const snapSeconds = SNAP_THRESHOLD_PX / zoom;
            let targetTime = 0;
            if (trimState.side === 'start') {
                targetTime = trimState.initialStartTime + deltaSec;
            } else {
                targetTime = trimState.initialStartTime + trimState.initialDuration + deltaSec;
            }
            const candidates = [currentTime, 0];
            const adjacentLanes = [track.lane - 1, track.lane + 1];
            tracks.forEach(other => {
                if (other.id === track.id) return;
                if (adjacentLanes.includes(other.lane)) {
                    candidates.push(other.startTime);
                    candidates.push(other.startTime + other.duration);
                }
            });
            let bestSnap = -1; let minDiff = Infinity;
            candidates.forEach(cand => {
                const diff = Math.abs(targetTime - cand);
                if (diff < snapSeconds && diff < minDiff) { bestSnap = cand; minDiff = diff; }
            });
            if (bestSnap !== -1) {
                if (trimState.side === 'start') { deltaSec = bestSnap - trimState.initialStartTime; } 
                else { deltaSec = bestSnap - (trimState.initialStartTime + trimState.initialDuration); }
                if (minDiff > 0.001 && navigator.vibrate) navigator.vibrate(5);
            }
        }
        setTrimState(prev => prev ? ({ ...prev, currentDelta: deltaSec }) : null);
    };

    const handleTrimPointerUp = (e: React.PointerEvent, track?: Track) => {
        if (!trimState?.isDragging) return;
        e.preventDefault();
        const t = track || tracks.find(tr => tr.id === effectiveSelectedTrackId);
        if (t) {
            let change = trimState.currentDelta;
            let { startTime: newStartTime, trimStart: newTrimStart, duration: newDuration } = t;
            if (trimState.side === 'start') {
                 if (newTrimStart + change < 0) change = -newTrimStart;
                 if (newDuration - change < 0.1) change = newDuration - 0.1;
                 newStartTime += change; newDuration -= change; newTrimStart += change;
            } else {
                 if (newDuration + change < 0.1) change = 0.1 - newDuration;
                 // Allow indefinite expansion if looping
                 if (!t.isLooping && newTrimStart + newDuration + change > t.buffer.duration) {
                     change = t.buffer.duration - (newTrimStart + newDuration);
                 }
                 newDuration += change;
            }
            updateTrack(t.id, { startTime: newStartTime, trimStart: newTrimStart, duration: newDuration });
            pushHistory();
        }
        setTrimState(null);
        if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
    };

    const handleTrackDoubleClick = (e: React.MouseEvent, track: Track) => {
        if (interactiveMode?.type === 'automation' && interactiveMode.trackId === track.id) {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;
            const trackH = laneHeight - 20;

            const HIT_RADIUS = 25; 
            let bestDist = Infinity;
            let bestIndex = -1;

            track.volumeAutomation?.forEach((p, idx) => {
                const px = (p.time - track.trimStart) * zoom;
                const py = (1 - p.value) * trackH;
                const dist = Math.hypot(px - relativeX, py - relativeY);
                if (dist < HIT_RADIUS && dist < bestDist) {
                    bestDist = dist;
                    bestIndex = idx;
                }
            });

            if (bestIndex !== -1) {
                 const newPoints = [...(track.volumeAutomation || [])];
                 newPoints.splice(bestIndex, 1);
                 updateTrack(track.id, { volumeAutomation: newPoints });
                 pushHistory();
            }
            return;
        }
        updatePlayhead(e.clientX);
    };

    // --- Fade Handles Logic ---
    const handleFadeHandlePointerDown = (e: React.PointerEvent) => {
        if (activePointers.current.size > 1) return;
        e.preventDefault(); e.stopPropagation();
        if (interactiveMode) {
             setInteractiveMode(prev => prev ? ({ ...prev, isDragging: true }) : null);
             (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    };

    const handleFadeHandleDrag = (e: React.PointerEvent, track: Track) => {
        if (activePointers.current.size > 1) return;
        if (!interactiveMode?.isDragging || interactiveMode.trackId !== track.id) return;
        
        if (interactiveMode.type !== 'fadeIn' && interactiveMode.type !== 'fadeOut') return;
        
        const rect = timelineRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const scroll = timelineRef.current?.scrollLeft || 0;
        const absoluteX = e.clientX - rect.left + scroll;
        let absoluteTime = absoluteX / zoom;
        
        const snapSeconds = SNAP_THRESHOLD_PX / zoom;
        let closestSnap = -1;
        let minDiff = Infinity;
        
        const candidates = [currentTime];
        tracks.forEach(t => {
            if (t.id === track.id) return;
            if (Math.abs(t.lane - track.lane) <= 1) {
                candidates.push(t.startTime);
                candidates.push(t.startTime + t.duration);
            }
        });

        candidates.forEach(cand => {
            const diff = Math.abs(absoluteTime - cand);
            if (diff < snapSeconds && diff < minDiff) {
                minDiff = diff;
                closestSnap = cand;
            }
        });
        
        if (closestSnap !== -1) {
            absoluteTime = closestSnap;
            if (minDiff > 0.001 && navigator.vibrate) navigator.vibrate(5);
        }

        const mouseRelTime = absoluteTime - track.startTime;
        
        if (interactiveMode.type === 'fadeIn') {
            let newDur = mouseRelTime;
            newDur = Math.max(0, Math.min(newDur, track.duration));
            updateTrack(track.id, { activeEffects: { ...track.activeEffects, fadeIn: newDur } });
        } else {
            let newDur = (track.startTime + track.duration) - absoluteTime;
            newDur = Math.max(0, Math.min(newDur, track.duration));
            updateTrack(track.id, { activeEffects: { ...track.activeEffects, fadeOut: newDur } });
        }
    };

    const handleFadeHandlePointerUp = (e: React.PointerEvent, track?: Track) => {
        if (interactiveMode?.isDragging) {
            setInteractiveMode(prev => prev ? ({ ...prev, isDragging: false }) : null);
            pushHistory();
            if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
        }
    };

    const deleteTrack = (id: string) => { pushHistory(); setTracks(prev => prev.filter(t => t.id !== id)); if (effectiveSelectedTrackId === id) { setSelectedTrackId(null); setIsTrimMode(false); } setSelection(null); };
    
    // ... (Keep complex logic for Crop/Cut/Effects/Export - minimal changes needed there) ...
    const handleCrop = () => { if (!effectiveSelectedTrackId) return; if (selection) { const track = tracks.find(t => t.id === effectiveSelectedTrackId); if (!track) return; pushHistory(); const relStart = Math.max(0, selection.start - track.startTime); const relEnd = Math.min(track.duration, selection.end - track.startTime); if (relEnd > relStart) { const newTrimStart = track.trimStart + relStart; const newDuration = relEnd - relStart; updateTrack(effectiveSelectedTrackId, { trimStart: newTrimStart, duration: newDuration, startTime: selection.start }); } setSelection(null); setIsTrimMode(false); stopPlayback(); } else { const willEnable = !isTrimMode; if (willEnable && !selectedTrackId) { setSelectedTrackId(effectiveSelectedTrackId); } setIsTrimMode(willEnable); if (!willEnable) setTrimState(null); } };
    
    const getSuffix = (i: number) => {
        if (i <= 26) return String.fromCharCode(64 + i); // 1=A..26=Z
        return `Z ${i - 26}`;
    };

    const handleCut = () => {
        if (!effectiveSelectedTrackId) { alert("Select a track to cut."); return; }
        const track = tracksRef.current.find(t => t.id === effectiveSelectedTrackId);
        if (!track) return;
        const relTime = currentTime - track.startTime;
        if (relTime <= 0.05 || relTime >= track.duration - 0.05) { alert("Place playhead inside track."); return; }
        const splitPointInFile = track.trimStart + relTime;
        
        // --- Suffix Logic Start ---
        // Regex for " [Letter]" or " [Letter] [Number]"
        const suffixRegex = /\s([A-Z])(\s\d+)?$/;
        const match = track.name.match(suffixRegex);
        
        let baseName = track.name;
        let isChild = false;
        
        if (match) {
            // Check if it's a valid generated suffix (single letter or Z #)
            // The regex enforces [A-Z] and optional space+digits.
            baseName = track.name.substring(0, match.index);
            isChild = true;
        }
        
        // Find max index used by children of this base name
        let maxIndex = 0;
        tracksRef.current.forEach(t => {
            if (t.name.startsWith(baseName)) {
                const remainder = t.name.slice(baseName.length);
                const m = remainder.match(/^\s([A-Z])(\s\d+)?$/);
                if (m) {
                    const l = m[1];
                    const n = m[2] ? parseInt(m[2].trim()) : 0;
                    let idx = l.charCodeAt(0) - 64; 
                    if (l === 'Z' && n > 0) idx = 26 + n;
                    if (idx > maxIndex) maxIndex = idx;
                }
            }
        });
        
        let name1 = "";
        let name2 = "";
        
        if (isChild) {
            // Keep current name for first part
            name1 = track.name;
            // Next one gets maxIndex + 1
            name2 = `${baseName} ${getSuffix(maxIndex + 1)}`;
        } else {
            // Splitting root
            // Create next two available
            // If base is "Track", and "Track A" exists (maxIndex 1), create B and C?
            // Or usually if root is "Track", maxIndex is 0. So A and B.
            const next1 = Math.max(maxIndex + 1, 1);
            const next2 = Math.max(maxIndex + 2, 2);
            name1 = `${baseName} ${getSuffix(next1)}`;
            name2 = `${baseName} ${getSuffix(next2)}`;
        }
        // --- Suffix Logic End ---

        pushHistory();
        
        const t1 = { 
            ...track, 
            id: Math.random().toString(36).substr(2, 9), 
            name: name1, 
            duration: relTime, 
            bpm: track.bpm 
        };
        
        const t2 = { 
            ...track, 
            id: Math.random().toString(36).substr(2, 9), 
            name: name2, 
            startTime: track.startTime + relTime, 
            trimStart: splitPointInFile, 
            duration: track.duration - relTime, 
            bpm: track.bpm 
        };
        
        setTracks(prev => {
            const idx = prev.findIndex(t => t.id === track.id);
            const n = [...prev];
            n.splice(idx, 1, t1, t2);
            return n;
        });
        setSelectedTrackId(t2.id);
        setIsTrimMode(false);
        stopPlayback();
    };
    
    const handleApplyEffect = async (effectId: string, params?: EffectParams & { level?: number }) => { if (!effectiveSelectedTrackId) return; const track = tracks.find(t => t.id === effectiveSelectedTrackId); if (!track) return; if (params?.interactive) { if (!selectedTrackId) setSelectedTrackId(effectiveSelectedTrackId); setInteractiveMode({ type: effectId as 'fadeIn' | 'fadeOut', trackId: track.id, isDragging: false }); const defaultFade = Math.min(track.duration, 2.0); const currentEffects = track.activeEffects || {}; if (effectId === 'fadeIn' && !currentEffects.fadeIn) { updateTrack(track.id, { activeEffects: { ...currentEffects, fadeIn: defaultFade } }); } if (effectId === 'fadeOut' && !currentEffects.fadeOut) { updateTrack(track.id, { activeEffects: { ...currentEffects, fadeOut: defaultFade } }); } return; } 
    if (params?.automation) { if (!selectedTrackId) setSelectedTrackId(effectiveSelectedTrackId); setInteractiveMode({ type: 'automation', trackId: track.id, isDragging: false }); if (!track.volumeAutomation) { updateTrack(track.id, { volumeAutomation: [{ time: track.trimStart, value: 1.0 }, { time: track.trimStart + track.duration, value: 1.0 }] }); } return; }
    pushHistory(); if (effectId === 'volume') { updateTrack(track.id, { volume: params?.level ?? 1.0 }); setAppState(AppState.EDITING); return; } setAppState(AppState.PROCESSING); stopPlayback(); try { 
        if (effectId === 'crossfade') { if (params?.restore) { if (track.crossfadeMetadata) { const { left, right } = track.crossfadeMetadata; setTracks(prev => { const filtered = prev.filter(t => t.id !== track.id); return [...filtered, left, right]; }); setSelectedTrackId(left.id); } setAppState(AppState.EDITING); return; } const duration = params?.duration || 1.0; const targetLane = track.lane; const splitTime = currentTime; const threshold = 0.1; const leftTrack = tracks.find(t => t.lane === targetLane && Math.abs((t.startTime + t.duration) - splitTime) < threshold); const rightTrack = tracks.find(t => t.lane === targetLane && Math.abs(t.startTime - splitTime) < threshold); if (leftTrack && rightTrack) { const mergedBuffer = await mergeBuffers(leftTrack.buffer, rightTrack.buffer, duration); const newTrack: Track = { id: Math.random().toString(36).substr(2, 9), name: `Merged (${leftTrack.name} + ${rightTrack.name})`, buffer: mergedBuffer, startTime: leftTrack.startTime, trimStart: 0, duration: mergedBuffer.duration, lane: targetLane, volume: 1.0, isMuted: false, isSolo: false, color: leftTrack.color, bpm: leftTrack.bpm === rightTrack.bpm ? leftTrack.bpm : undefined, crossfadeMetadata: { left: leftTrack, right: rightTrack, duration } }; setTracks(prev => { const filtered = prev.filter(t => t.id !== leftTrack.id && t.id !== rightTrack.id); return [...filtered, newTrack]; }); setSelectedTrackId(newTrack.id); } else { alert("To crossfade, place two clips side-by-side on the same lane and move the playhead to their meeting point."); } setAppState(AppState.EDITING); return; } 
        
        let newEffects: ActiveEffects = { ...(track.activeEffects || {}) }; 
        if (params?.restore) { 
            if (effectId === 'fadeIn') delete newEffects.fadeIn; 
            if (effectId === 'fadeOut') delete newEffects.fadeOut; 
            if (effectId === 'eq') delete newEffects.eqPreset; 
            if (effectId === 'normalize') delete newEffects.normalize; 
            if (effectId === 'reverse') delete newEffects.reverse; 
            if (effectId === 'removeVocals') delete newEffects.vocalRemover;
            if (effectId === 'isolateVocals') delete newEffects.vocalIsolator;
            if (effectId === 'speed') { delete newEffects.playbackRate; delete newEffects.preservePitch; } 
        } else if (effectId !== 'applyActiveFades') { 
            if (effectId === 'fadeIn') newEffects.fadeIn = params?.duration; 
            if (effectId === 'fadeOut') newEffects.fadeOut = params?.duration; 
            if (effectId === 'eq') newEffects.eqPreset = params?.preset; 
            if (effectId === 'normalize') newEffects.normalize = true; 
            if (effectId === 'reverse') newEffects.reverse = true; 
            if (effectId === 'speed') { newEffects.playbackRate = params?.playbackRate; newEffects.preservePitch = params?.preservePitch; } 
            if (params?.toggle) { 
                if (effectId === 'normalize') newEffects.normalize = !track.activeEffects?.normalize; 
                if (effectId === 'reverse') newEffects.reverse = !track.activeEffects?.reverse; 
                if (effectId === 'removeVocals') newEffects.vocalRemover = !track.activeEffects?.vocalRemover;
                if (effectId === 'isolateVocals') newEffects.vocalIsolator = !track.activeEffects?.vocalIsolator;
            } 
        } 
        
        // --- Effect Pipeline ---
        let pipelineBuffer = track.originalBuffer || track.buffer; 
        
        // 1. Reverse
        if (newEffects.reverse) { 
            pipelineBuffer = reverseBuffer(pipelineBuffer); 
        } 
        
        // 2. Speed / Time Stretch
        if (newEffects.playbackRate && newEffects.playbackRate !== 1.0) { 
            pipelineBuffer = await changeSpeed(pipelineBuffer, newEffects.playbackRate, newEffects.preservePitch); 
        } 
        
        // 3. EQ
        if (newEffects.eqPreset) { 
            pipelineBuffer = await applyEQ(pipelineBuffer, newEffects.eqPreset); 
        } 
        
        // 4. Vocal Processing (Karaoke/Isolate)
        if (newEffects.vocalIsolator) {
            pipelineBuffer = await isolateVocals(pipelineBuffer);
        } else if (newEffects.vocalRemover) {
            pipelineBuffer = await removeVocals(pipelineBuffer);
        }

        // 5. Normalize
        if (newEffects.normalize) { 
            pipelineBuffer = normalizeBuffer(pipelineBuffer); 
        } 
        
        // 6. Fades
        if (newEffects.fadeIn) { 
            pipelineBuffer = await applyFade(pipelineBuffer, 'in', newEffects.fadeIn); 
        } 
        if (newEffects.fadeOut) { 
            pipelineBuffer = await applyFade(pipelineBuffer, 'out', newEffects.fadeOut); 
        } 
    
    const trackUpdates: Partial<Track> = { buffer: pipelineBuffer, originalBuffer: track.originalBuffer || track.buffer, activeEffects: newEffects, duration: pipelineBuffer.duration };
    
    if (effectId === 'speed' && track.bpm) {
         const rate = newEffects.playbackRate || 1.0;
         const newBpm = Math.round(track.bpm * rate);
         let newName = track.name;
         
         const bpmRegex = /\(\d+\s*BPM\)/i;
         const bpmString = `(${newBpm} BPM)`;
         
         if (bpmRegex.test(newName)) {
             newName = newName.replace(bpmRegex, bpmString);
         } else {
             newName = `${newName} ${bpmString}`;
         }
         trackUpdates.name = newName;
    }

    updateTrack(track.id, trackUpdates); 
    setAppState(AppState.EDITING); 
    } catch (e) { console.error(e); setAppState(AppState.ERROR); } };
    const handleAddBeat = (generatedBuffer: AudioBuffer, name: string) => { 
        pushHistory(); 
        const insertion = getSmartInsertionPoint(generatedBuffer.duration);
        let parsedBpm: number | undefined; 
        const bpmMatch = name.match(/\((\d+)\s*BPM\)/); 
        if (bpmMatch && bpmMatch[1]) parsedBpm = parseInt(bpmMatch[1]); 
        
        setTracks(prev => [...prev, { 
            id: Math.random().toString(36).substr(2, 9), 
            name, 
            buffer: generatedBuffer, 
            startTime: insertion.startTime, 
            trimStart: 0, 
            duration: generatedBuffer.duration, 
            lane: insertion.lane, 
            volume: 0.8, 
            isMuted: false, 
            isSolo: false, 
            color: TRACK_COLORS[insertion.lane % TRACK_COLORS.length], 
            bpm: parsedBpm,
            isLooping: true 
        }]); 
        setIsTrimMode(false); 
    };
    
    const handleExport = async (targetRate: number, format: ExportFormat) => { 
        if (tracks.length === 0) return; 
        setAppState(AppState.PROCESSING); 
        setTimeout(async () => { 
            try { 
                const mixed = await mixTracks(tracks, maxDuration); 
                const processed = await resampleBuffer(mixed, targetRate); 
                let blob: Blob; 
                let extension: string; 
                
                if (format === 'mp3') { 
                    blob = encodeMP3(processed); 
                    extension = 'mp3'; 
                } else if (format === 'flac') {
                    blob = encodeFLAC(processed); 
                    extension = 'flac'; 
                } else { 
                    blob = encodeWAV(processed); 
                    extension = 'wav'; 
                } 
                
                const url = URL.createObjectURL(blob); 
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `sonicpocket_mix_${Date.now()}.${extension}`; 
                a.click(); 
                URL.revokeObjectURL(url); 
            } catch(e) { 
                console.error(e); 
                alert("Export failed: " + (e instanceof Error ? e.message : String(e))); 
            } finally { 
                setAppState(AppState.EDITING); 
            } 
        }, 100); 
    };

    const handleWheel = (e: React.WheelEvent) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); const newZoom = zoom + (-e.deltaY * 0.5); performZoom(newZoom); } };
    const handleSaveAndClose = async () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); try { if ((tracks.length > 0 || currentProjectId) && !ignoreChangesRef.current) { let pid = currentProjectId; let pname = currentProjectName; if (!pid && tracks.length > 0) { const projects = await loadProjects(); pid = Math.random().toString(36).substr(2, 9); pname = `Project ${projects.length + 1}`; setCurrentProjectId(pid); setCurrentProjectName(pname); } if (pid) { setSaveStatus('saving'); const thumb = generateProjectPreview(tracks, 100, 100); await saveProject(pid, pname, tracks, thumb); setRecentProjectPreview(thumb); setSaveStatus('saved'); } const updated = await loadProjects(); setSavedProjects(updated); } } catch (e) { alert("Could not save project. Check your device storage."); setSaveStatus('unsaved'); } setAppState(AppState.LIBRARY); };
    const handleNewProject = () => { stopPlayback(); if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); ignoreChangesRef.current = true; setTracks([]); setHistory([]); setSelection(null); setCurrentTime(0); setCurrentProjectId(null); setCurrentProjectName(""); setRecentProjectPreview(null); setSaveStatus('saved'); setLoadError(null); setInteractiveMode(null); setAppState(AppState.IDLE); setTimeout(() => { ignoreChangesRef.current = false; }, 100); };
    useEffect(() => { if (ignoreChangesRef.current) return; if (tracks.length === 0 && !currentProjectId) return; isDirtyRef.current = true; setSaveStatus('unsaved'); if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = setTimeout(async () => { if (!isDirtyRef.current) return; if (appState !== AppState.EDITING) return; setSaveStatus('saving'); try { let pid = currentProjectId; let pname = currentProjectName; if (!pid) { const projects = await loadProjects(); pid = Math.random().toString(36).substr(2, 9); pname = `Project ${projects.length + 1}`; setCurrentProjectId(pid); setCurrentProjectName(pname); } const thumb = generateProjectPreview(tracks, 100, 100); setRecentProjectPreview(thumb); await saveProject(pid, pname, tracks, thumb); const updated = await loadProjects(); setSavedProjects(updated); isDirtyRef.current = false; setSaveStatus('saved'); } catch (e) { setSaveStatus('unsaved'); } }, 2000); return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); } }, [tracks, currentProjectId, currentProjectName, appState]);

    const handlePointerDownCapture = (e: React.PointerEvent) => { 
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); 
        
        if (activePointers.current.size === 2) { 
            setIsZooming(true); 
            if (longPressTimerRef.current) { 
                clearTimeout(longPressTimerRef.current); 
                longPressTimerRef.current = null; 
            } 
            if (draggingTrackId) setDraggingTrackId(null); 
            if (trimState) setTrimState(null); 
            if (interactiveMode) setInteractiveMode(null); 
            
            // FIX: Cancel timeline tap to prevent playhead jump on release
            dragRef.current.isTimelineTap = false;

            const points = Array.from(activePointers.current.values()) as {x: number, y: number}[]; 
            const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y); 
            const distX = Math.abs(points[0].x - points[1].x); 
            const distY = Math.abs(points[0].y - points[1].y); 
            
            pinchState.current = {
                mode: null,
                startDist: dist,
                startDistX: distX,
                startDistY: distY,
                startZoom: zoomRef.current, // Use Ref for reliability
                startLaneHeight: laneHeightRef.current, // Use Ref for reliability
                isLocked: false
            };
        } 
        
        if (dragRef.current.isTimelineTap && activePointers.current.size === 1) { 
            const dist = Math.abs(e.clientX - dragRef.current.timelineStartX); 
            if (dist > 10) { dragRef.current.isTimelineTap = false; } 
        } 
    };

    const handlePointerMoveCapture = (e: React.PointerEvent) => { 
        if (activePointers.current.has(e.pointerId)) { 
            activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); 
        } 
        
        if (activePointers.current.size > 1) { 
            e.preventDefault(); 
        } 
        
        if (activePointers.current.size === 2) { 
            const points = Array.from(activePointers.current.values()) as {x: number, y: number}[]; 
            const currDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y); 
            const currDistX = Math.abs(points[0].x - points[1].x); 
            const currDistY = Math.abs(points[0].y - points[1].y); 
            
            const state = pinchState.current; 
            
            if (!state.isLocked) { 
                const totalMove = Math.abs(currDist - state.startDist); 
                // Increased threshold from 10 to 20 to prevent accidental locks
                if (totalMove > 20) { 
                    const deltaX = Math.abs(currDistX - state.startDistX); 
                    const deltaY = Math.abs(currDistY - state.startDistY); 
                    
                    // Strict dominance check: if Y moved more than X, it's vertical.
                    if (deltaY > deltaX) { 
                        state.mode = 'vertical'; 
                    } else { 
                        state.mode = 'horizontal'; 
                    } 
                    state.isLocked = true; 

                    // FIX: Re-base start values to current values when locking
                    // This prevents the initial "jitter" movement from before the lock from affecting the zoom calculation
                    state.startDistX = currDistX;
                    state.startDistY = currDistY;
                    state.startZoom = zoomRef.current;
                    state.startLaneHeight = laneHeightRef.current;
                } 
            } 
            
            if (state.isLocked) { 
                if (state.mode === 'horizontal') { 
                    // For timeline zoom, using X distance change feels more strictly separated
                    // than using hypotenuse, ensuring vertical slippage doesn't affect zoom.
                    if (state.startDistX > 10) { // Safety check to avoid unstable division
                        const scale = currDistX / state.startDistX; 
                        const newZoom = state.startZoom * scale; 
                        // Use Ref to call latest performZoom which has updated state closure
                        performZoomRef.current(newZoom); 
                    }
                } else if (state.mode === 'vertical') { 
                    const deltaY = currDistY - state.startDistY; 
                    // Pass change in Y to vertical zoom handler
                    performVerticalZoom(deltaY * 2, state.startLaneHeight); 
                } 
            } 
        } 
        
        if (dragRef.current.isTimelineTap && activePointers.current.size === 1) { 
            const dist = Math.abs(e.clientX - dragRef.current.timelineStartX); 
            if (dist > 10) { dragRef.current.isTimelineTap = false; } 
        } 
    };

    const handlePointerUpCapture = (e: React.PointerEvent) => { 
        activePointers.current.delete(e.pointerId); 
        if (activePointers.current.size < 2) { 
            setIsZooming(false); 
            pinchState.current.isLocked = false; 
            pinchState.current.mode = null; 
        } 
        if (dragRef.current.isTimelineTap && !isScrubbing && !draggingTrackId && activePointers.current.size === 0) { 
            updatePlayhead(e.clientX); 
            dragRef.current.isTimelineTap = false; 
        } 
    };

    if (appState === AppState.LIBRARY) {
        return (
            <div className="flex flex-col h-full bg-zinc-950 text-white font-sans p-6 overflow-hidden">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Project Library</h1>
                    <div className="flex gap-2">
                        <Button variant="primary" onClick={handleNewProject} label="New Project" icon={<NewDocIcon />} className="text-sm px-4 py-2" />
                        <Button variant="secondary" onClick={() => setAppState(AppState.IDLE)} label="Close" />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto space-y-4">
                    {savedProjects.length === 0 ? <div className="text-zinc-500 text-center py-20">No saved projects yet.</div> : savedProjects.map(project => (
                        <div key={project.id} onClick={() => { if(editingProjectId) return; stopPlayback(); setAppState(AppState.LOADING); setLoadError(null); ignoreChangesRef.current = true; setTracks([]); setHistory([]); setSelection(null); setSelectedTrackId(null); setTrimState(null); setIsTrimMode(false); setInteractiveMode(null); setCurrentTime(0); setSaveStatus('saved'); const ctx = getAudioContext(); if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} } setCurrentProjectId(project.id); setCurrentProjectName(project.name); setRecentProjectPreview(project.thumbnail || null); loadProjects().then(freshProjects => { const targetProject = freshProjects.find(p => p.id === project.id) || project; if (targetProject.tracks && targetProject.tracks.length > 0) { loadProjectTracks(targetProject.tracks).then(loadedTracks => { if (loadedTracks.length === 0) { setLoadError("Project corrupted."); return; } setTracks(loadedTracks); setAppState(AppState.EDITING); setTimeout(() => { ignoreChangesRef.current = false; isDirtyRef.current = false; }, 100); }); } else { setTracks([]); setAppState(AppState.EDITING); setTimeout(() => { ignoreChangesRef.current = false; isDirtyRef.current = false; }, 100); } }); }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-cyan-500/50 transition cursor-pointer group">
                             <div className="w-16 h-16 bg-zinc-950 rounded-lg overflow-hidden shrink-0 border border-zinc-800">{project.thumbnail ? <img src={project.thumbnail} alt="" className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full bg-zinc-800" />}</div>
                             {editingProjectId === project.id ? (
                                <form className="flex-1 min-w-0 flex items-center gap-2" onClick={e => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); if (editingName.trim().length > 0) { updateProjectName(project.id, editingName.trim()).then(() => { setSavedProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: editingName.trim() } : p)); setEditingProjectId(null); }); } }}>
                                    <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-bold w-full" autoFocus onClick={e => e.stopPropagation()}/>
                                    <button type="submit" className="p-3 rounded-full bg-zinc-800 border border-zinc-700 text-green-500"><CheckIcon /></button>
                                </form>
                             ) : (
                                <div className="flex-1 min-w-0"><h3 className="text-lg font-bold text-white truncate">{project.name}</h3><p className="text-xs text-zinc-500">{new Date(project.lastModified).toLocaleString()}</p></div>
                             )}
                             {editingProjectId !== project.id && ( <div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditingProjectId(project.id); setEditingName(project.name); }} className="p-3 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"><PencilIcon/></button><button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setProjectToDelete(project.id); }} className="p-3 rounded-full hover:bg-red-900/30 text-zinc-400 hover:text-red-400 transition"><TrashIcon/></button></div> )}
                        </div>
                    ))}
                </div>
                {projectToDelete && ( <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setProjectToDelete(null)}><div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xs p-6 shadow-2xl space-y-6 text-center" onClick={e => e.stopPropagation()}><div><h2 className="text-xl font-bold text-white">Delete Project?</h2></div><div className="grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => setProjectToDelete(null)} label="Cancel" /><Button variant="danger" onClick={() => { if(projectToDelete) deleteProject(projectToDelete).then(() => loadProjects().then(setSavedProjects)); setProjectToDelete(null); }} label="Delete" /></div></div></div> )}
            </div>
        );
    }

    return (
        <div className="flex flex-col landscape:flex-row landscape:xl:flex-col h-full bg-zinc-950 text-white font-sans selection:bg-cyan-500/30 overflow-hidden relative">
            {appState === AppState.LOADING && (
                <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-6 p-8 text-center">
                    {loadError ? (
                        <>
                            <h2 className="text-xl font-bold text-white">Error</h2><p className="text-zinc-400">{loadError}</p>
                            <Button variant="secondary" onClick={() => setAppState(AppState.LIBRARY)} label="Library" />
                        </>
                    ) : <><LoadingSpinner /><p className="text-zinc-400 animate-pulse">Loading...</p></>}
                </div>
            )}

            <Header 
                currentProjectName={currentProjectName}
                saveStatus={saveStatus}
                hasProjectId={!!currentProjectId}
                historyLength={history.length}
                tracksCount={tracks.length}
                zoom={zoom}
                currentTime={currentTime}
                maxDuration={maxDuration}
                recentProjectPreview={recentProjectPreview}
                onZoom={performZoom}
                onUndo={handleUndo}
                onExport={() => setExportModalOpen(true)}
                onSaveAndClose={handleSaveAndClose}
                minZoom={minZoom}
            />

            <main 
                className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950 touch-none" 
                // Removed inline onWheel to rely on global listener for consistency
                onPointerDownCapture={handlePointerDownCapture} 
                onPointerUpCapture={handlePointerUpCapture} 
                onPointerCancelCapture={handlePointerUpCapture} 
                onPointerMoveCapture={handlePointerMoveCapture} 
                onPointerMove={(e) => { handleTrimPointerMove(e); handleTrackDragMove(e); if(selectedTrack) handleFadeHandleDrag(e, selectedTrack); if(isScrubbing) handlePlayheadPointerMove(e); }} 
                onPointerUp={(e) => { if(trimState) setTrimState(null); if(draggingTrackId) handleTrackPointerUp(e, tracks.find(t => t.id === draggingTrackId)!); if(interactiveMode && selectedTrack) handleFadeHandlePointerUp(e, selectedTrack); if(isScrubbing) handlePlayheadPointerUp(e); }}
            >
                {/* Mobile Landscape Info Bar */}
                <div className="hidden landscape:flex landscape:xl:hidden w-full h-7 bg-zinc-950 border-b border-zinc-900 items-center px-4 shrink-0 z-20">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500">
                        <span className="uppercase">TRACKS: {tracks.length}</span>
                        <span className="tabular-nums normal-case">
                            <span className="text-cyan-500">{formatTime(currentTime)}</span>
                            <span className="text-zinc-600 mx-2">/</span>
                            <span>{formatTime(maxDuration)}</span>
                        </span>
                    </div>
                </div>

                <div className="flex-1 relative overflow-hidden w-full">
                    {tracks.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-4"><p>No tracks added.</p><div className="flex gap-4"><Button label="Add Audio" onClick={() => fileInputRef.current?.click()} /><Button label="Library" variant="secondary" icon={<LibraryIcon/>} onClick={handleSaveAndClose} /></div></div>
                    ) : (
                        <Timeline 
                            ref={timelineRef}
                            playheadRef={playheadRef}
                            tracks={tracks}
                            currentTime={currentTime}
                            zoom={zoom}
                            maxDuration={maxDuration}
                            totalLanes={totalLanes}
                            beatDuration={beatDuration}
                            selection={selection}
                            selectedTrackId={effectiveSelectedTrackId}
                            draggingTrackId={draggingTrackId}
                            trimState={trimState}
                            interactiveMode={interactiveMode}
                            isTrimMode={isTrimMode}
                            isScrubbing={isScrubbing}
                            laneHeight={laneHeight}
                            isZooming={isZooming}
                            viewportWidth={viewportWidth}
                            onScroll={handleTimelineScroll}
                            onTimelinePointerDown={handleTimelinePointerDown}
                            onPlayheadPointerDown={handlePlayheadPointerDown}
                            onPlayheadPointerMove={handlePlayheadPointerMove}
                            onPlayheadPointerUp={handlePlayheadPointerUp}
                            onTrackPointerDown={handleTrackPointerDown}
                            onTrackPointerUp={handleTrackPointerUp}
                            onTrackPointerCancel={handleTrackPointerCancel}
                            onTrimPointerDown={handleTrimPointerDown}
                            onTrimPointerUp={handleTrimPointerUp}
                            onFadeHandlePointerDown={handleFadeHandlePointerDown}
                            onTrackDoubleClick={handleTrackDoubleClick}
                            onMute={(id, muted) => updateTrack(id, { isMuted: muted })}
                            onDelete={deleteTrack}
                            onSelectionChange={setSelection}
                            onColorChange={(id, color) => updateTrack(id, { color })}
                        />
                    )}
                </div>
            </main>

            <TransportControls 
                isPlaying={isPlaying}
                isRecording={isRecording}
                selectedTrackId={effectiveSelectedTrackId}
                isTrimMode={isTrimMode}
                interactiveMode={interactiveMode}
                selection={selection}
                hasTracks={tracks.length > 0}
                recentProjectPreview={recentProjectPreview}
                onPlayPause={handlePlayPause}
                onToggleRecord={handleToggleRecord}
                onCut={handleCut}
                onCrop={handleCrop}
                onEffects={() => interactiveMode ? setInteractiveMode(null) : setEffectsModalOpen(true)}
                onImportClick={() => fileInputRef.current?.click()}
                onBeatClick={() => setBeatModalOpen(true)}
                onLibraryClick={handleSaveAndClose}
            />

            <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.aac,.mp4,.mov,.webm" className="hidden" />
            <BeatMakerModal isOpen={isBeatModalOpen} onClose={() => setBeatModalOpen(false)} onGenerate={handleAddBeat} initialBpm={projectBpm} />
            <EffectsModal 
                isOpen={isEffectsModalOpen} 
                onClose={() => setEffectsModalOpen(false)} 
                onApply={handleApplyEffect} 
                activeEffects={selectedTrack?.activeEffects} 
                isCrossfaded={!!selectedTrack?.crossfadeMetadata} 
                currentVolume={selectedTrack?.volume} 
                trackBpm={selectedTrack?.bpm}
            />
            <ExportModal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} onExport={handleExport} originalSampleRate={projectSampleRate} />
        </div>
    );
};

export default App;