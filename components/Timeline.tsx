
import React, { forwardRef, useEffect, useState, useRef } from 'react';
import WaveformDisplay from './WaveformDisplay';
import { Track, SelectionRange, TrimState } from '../types';
import { TRACK_COLORS } from '../constants';

// Icons
const ChevronLeftIcon = () => (
    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const PaletteIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.077-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
);

const MutedSpeakerIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

// Helper to convert HSL to Hex for color wheel
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

interface TimelineProps {
    tracks: Track[];
    currentTime: number;
    zoom: number;
    maxDuration: number;
    totalLanes: number;
    beatDuration: number;
    selection: SelectionRange | null;
    selectedTrackId: string | null;
    draggingTrackId: string | null;
    trimState: TrimState | null;
    interactiveMode: any;
    isTrimMode: boolean;
    isScrubbing: boolean;
    laneHeight: number;
    playheadRef: React.RefObject<HTMLDivElement>;
    isZooming: boolean;
    viewportWidth: number;
    
    // Handlers
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onTimelinePointerDown: (e: React.PointerEvent) => void;
    onPlayheadPointerDown: (e: React.PointerEvent) => void;
    onPlayheadPointerMove: (e: React.PointerEvent) => void;
    onPlayheadPointerUp: (e: React.PointerEvent) => void;
    onTrackPointerDown: (e: React.PointerEvent, track: Track) => void;
    onTrackPointerUp: (e: React.PointerEvent, track: Track) => void;
    onTrackPointerCancel: (e: React.PointerEvent) => void;
    onTrimPointerDown: (e: React.PointerEvent, track: Track, side: 'start' | 'end') => void;
    onTrimPointerUp: (e: React.PointerEvent, track?: Track) => void;
    onFadeHandlePointerDown: (e: React.PointerEvent) => void;
    onTrackDoubleClick: (e: React.MouseEvent, track: Track) => void;
    onMute: (trackId: string, muted: boolean) => void;
    onDelete: (trackId: string) => void;
    onSelectionChange: (sel: SelectionRange | null) => void;
    onColorChange: (trackId: string, color: string) => void;
}

export const Timeline = forwardRef<HTMLDivElement, TimelineProps>(({
    tracks, currentTime, zoom, maxDuration, totalLanes, beatDuration,
    selection, selectedTrackId, draggingTrackId, trimState, interactiveMode, isTrimMode, isScrubbing,
    laneHeight, playheadRef, isZooming, viewportWidth,
    onScroll, onTimelinePointerDown, onPlayheadPointerDown, onPlayheadPointerMove, onPlayheadPointerUp,
    onTrackPointerDown, onTrackPointerUp, onTrackPointerCancel, onTrimPointerDown, onTrimPointerUp, onFadeHandlePointerDown,
    onTrackDoubleClick,
    onMute, onDelete, onSelectionChange, onColorChange
}, ref) => {

    const [colorPickerTrackId, setColorPickerTrackId] = useState<string | null>(null);
    const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
    const [customColors, setCustomColors] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('sonic_custom_colors');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const colorWheelRef = useRef<HTMLDivElement>(null);
    const [isDraggingColor, setIsDraggingColor] = useState(false);

    // Close color picker when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (colorPickerTrackId && !isDraggingColor) setColorPickerTrackId(null);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [colorPickerTrackId, isDraggingColor]);

    // Reset picker state when closing
    useEffect(() => {
        if (!colorPickerTrackId) setShowCustomColorPicker(false);
    }, [colorPickerTrackId]);

    // Strict Scroll Prevention for iOS/Mobile
    useEffect(() => {
        const el = (ref as React.RefObject<HTMLDivElement>).current;
        if (!el) return;

        const preventDefaultScroll = (e: TouchEvent) => {
            // 1. Multitouch: If more than 1 finger, ALWAYS prevent default (scrolling)
            if (e.touches.length > 1) {
                e.preventDefault();
                return;
            }

            // 2. Dragging/Editing: If specific modes are active, prevent scroll.
            // Note: draggingTrackId is set AFTER long press, so initial swipe is allowed.
            if (draggingTrackId || isZooming || trimState?.isDragging || interactiveMode?.isDragging || isScrubbing) {
                e.preventDefault();
                return;
            }
        };

        el.addEventListener('touchmove', preventDefaultScroll, { passive: false });
        return () => {
            el.removeEventListener('touchmove', preventDefaultScroll);
        };
    }, [draggingTrackId, isZooming, trimState, interactiveMode, isScrubbing, ref]);

    // Logic to calculate color from wheel position
    const calculateColorFromWheel = (clientX: number, clientY: number): string => {
        if (!colorWheelRef.current) return '#000000';
        const rect = colorWheelRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Relative coordinates from center
        const x = clientX - rect.left - centerX;
        const y = clientY - rect.top - centerY;
        
        // Angle (Hue)
        // Adjust standard atan2 (0 is Right) to CSS conic (0 is Top)
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = (angle + 90);
        if (angle < 0) angle += 360;
        
        // Distance (Saturation/Lightness)
        const dist = Math.hypot(x, y);
        const maxRadius = rect.width / 2;
        const normalizedDist = Math.min(1, dist / maxRadius);
        
        // Visual mapping: Center is White, Edge is Color
        const sat = normalizedDist * 100;
        const light = 100 - (normalizedDist * 50); // 100% at center (white), 50% at edge (pure color)
        
        return hslToHex(angle, sat, light);
    };

    const handleWheelPointerDown = (e: React.PointerEvent, trackId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingColor(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        
        const newColor = calculateColorFromWheel(e.clientX, e.clientY);
        onColorChange(trackId, newColor);
    };

    const handleWheelPointerMove = (e: React.PointerEvent, trackId: string) => {
        if (!isDraggingColor) return;
        e.preventDefault();
        e.stopPropagation();
        const newColor = calculateColorFromWheel(e.clientX, e.clientY);
        onColorChange(trackId, newColor);
    };

    const handleWheelPointerUp = (e: React.PointerEvent, trackId: string) => {
        if (!isDraggingColor) return;
        setIsDraggingColor(false);
        e.preventDefault();
        e.stopPropagation();
        
        const newColor = calculateColorFromWheel(e.clientX, e.clientY);
        onColorChange(trackId, newColor);
        
        // Save unique color to history
        setCustomColors(prev => {
            if (prev.includes(newColor)) return prev;
            const next = [...prev, newColor].slice(-10);
            localStorage.setItem('sonic_custom_colors', JSON.stringify(next));
            return next;
        });

        if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) {
            e.target.releasePointerCapture(e.pointerId);
        }

        // Close Popup on release
        setColorPickerTrackId(null);
    };

    // Calculate content height
    const contentHeight = totalLanes * laneHeight;

    // Calculate dynamic width to limit scroll past end of last track (last track end at center of viewport)
    // We explicitly calculate the end position of the content (maxDuration * zoom).
    // Then we add exactly half the viewport width.
    // This ensures that when the user scrolls to the very end, the end of the timeline is exactly in the center of the screen.
    const vWidth = viewportWidth > 0 ? viewportWidth : window.innerWidth;
    const timelineWidth = Math.max(vWidth, (maxDuration * zoom) + (vWidth / 2));

    return (
        <div 
            ref={ref} 
            className={`relative overflow-x-auto overflow-y-auto h-full overscroll-none ${isZooming ? 'overflow-hidden' : 'touch-pan-x touch-pan-y'}`} 
            onScroll={onScroll}
            style={{ 
                // CRITICAL FIX: Use 'pan-x pan-y' to block pinch-zoom but allow scroll.
                // 'none' is used when custom actions are taking place to block everything.
                touchAction: (isZooming || draggingTrackId || trimState?.isDragging) ? 'none' : 'pan-x pan-y',
            }}
        >
            <div className="relative min-h-full" style={{ width: `${timelineWidth}px`, height: `${contentHeight}px` }} onPointerDown={onTimelinePointerDown}>
                {/* Grid */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `linear-gradient(90deg, #3f3f46 1px, transparent 1px)`, backgroundSize: `${zoom * beatDuration}px 100%` }} />
                    {Array.from({ length: totalLanes }).map((_, i) => (<div key={i} className="w-full border-b border-zinc-900/50" style={{ height: `${laneHeight}px`, backgroundColor: i % 2 === 0 ? 'rgba(24, 24, 27, 0.2)' : 'transparent' }}><span className="text-[9px] text-zinc-700 p-2 font-mono">L{i + 1}</span></div>))}
                </div>
                
                {/* Playhead */}
                <div ref={playheadRef} className={`absolute top-0 bottom-0 w-6 -ml-3 z-50 flex justify-center group ${isScrubbing ? 'cursor-grabbing' : 'cursor-grab'} touch-none`} style={{ transform: `translateX(${currentTime * zoom}px)`, height: '100%' }} onPointerDown={onPlayheadPointerDown} onPointerMove={onPlayheadPointerMove} onPointerUp={onPlayheadPointerUp} onPointerCancel={onPlayheadPointerUp}>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    <div className="sticky top-0 w-4 h-4 bg-red-500 rounded-full shadow-md z-50 transition-transform group-hover:scale-125" />
                </div>

                {/* Tracks */}
                {tracks.map((track) => {
                    const isSelected = selectedTrackId === track.id;
                    const isDraggingThis = draggingTrackId === track.id;
                    const isTrimActive = isSelected && isTrimMode;
                    const isInteractive = interactiveMode?.trackId === track.id;
                    const isAutomationActive = isInteractive && interactiveMode?.type === 'automation';
                    
                    let visualStartTime = track.startTime;
                    let visualDuration = track.duration;
                    let visualTrimStart = track.trimStart;
                    
                    if (isTrimActive && trimState?.isDragging) { 
                        if (trimState.side === 'start') { 
                            let change = trimState.currentDelta; 
                            if (visualTrimStart + change < 0) change = -visualTrimStart; 
                            if (visualDuration - change < 0.1) change = visualDuration - 0.1; 
                            visualStartTime += change; visualDuration -= change; visualTrimStart += change; 
                        } else { 
                            let change = trimState.currentDelta; 
                            if (visualDuration + change < 0.1) change = 0.1 - visualDuration; 
                            // Only cap to buffer duration if NOT looping
                            if (!track.isLooping && visualTrimStart + visualDuration + change > track.buffer.duration) {
                                change = track.buffer.duration - (visualTrimStart + visualDuration); 
                            }
                            visualDuration += change; 
                        } 
                    }
                    
                    const containerLeft = Math.round(visualStartTime * zoom);
                    const containerWidth = Math.ceil(visualDuration * zoom);
                    const handleWidth = 32; 
                    const handleDuration = handleWidth / zoom;
                    const isLeftDragging = isTrimActive && trimState?.isDragging && trimState?.side === 'start';
                    const isRightDragging = isTrimActive && trimState?.isDragging && trimState?.side === 'end';
                    const fadeInDuration = track.activeEffects?.fadeIn || 0;
                    const fadeOutDuration = track.activeEffects?.fadeOut || 0;
                    
                    const waveformHeight = laneHeight - 20;
                    const overlayHeight = waveformHeight - 20;

                    // Determine touch-action
                    // Default to pan-x pan-y (scrolling allowed)
                    // Disable ONLY if currently dragging, resizing, or interacting with handles
                    const trackTouchAction = (isDraggingThis || (isTrimActive && trimState?.isDragging) || interactiveMode?.isDragging) 
                        ? 'none' 
                        : 'pan-x pan-y';

                    return (
                        <div 
                            key={track.id} 
                            className={`absolute rounded-lg border select-none track-clip group ${isDraggingThis ? 'z-50 shadow-2xl ring-2 ring-cyan-400 cursor-grabbing bg-zinc-800' : ''} ${isSelected && !isDraggingThis ? 'bg-zinc-800/90 border-cyan-500/50 ring-1 ring-cyan-500/20 z-40' : ''} ${!isSelected && !isDraggingThis ? 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 z-30' : ''}`} 
                            style={{ 
                                left: `${containerLeft}px`, 
                                top: `${track.lane * laneHeight + 10}px`, 
                                width: `${containerWidth}px`, 
                                height: `${waveformHeight}px`, 
                                transition: isDraggingThis || (isTrimActive && trimState?.isDragging) ? 'none' : 'top 0.2s ease-out, transform 0.1s ease-out',
                                touchAction: trackTouchAction 
                            }} 
                            onPointerDown={(e) => onTrackPointerDown(e, track)} 
                            onPointerUp={(e) => onTrackPointerUp(e, track)} 
                            onPointerCancel={onTrackPointerCancel}
                            onDoubleClick={(e) => onTrackDoubleClick(e, track)}
                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            {!isTrimActive && !isDraggingThis && !isAutomationActive && ( 
                                <div className={`absolute right-1 top-1 z-20 flex gap-1 transition-opacity ${colorPickerTrackId === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()} 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setColorPickerTrackId(colorPickerTrackId === track.id ? null : track.id); 
                                        }} 
                                        className="p-1 rounded text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                    >
                                        <PaletteIcon />
                                    </button>
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()} 
                                        onClick={(e) => { e.stopPropagation(); onMute(track.id, !track.isMuted); }} 
                                        className={`p-1 rounded text-[9px] font-bold ${track.isMuted ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                                    >
                                        <MutedSpeakerIcon />
                                    </button>
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()} 
                                        onClick={(e) => { e.stopPropagation(); onDelete(track.id); }} 
                                        className="p-1 rounded text-[9px] bg-zinc-800 hover:bg-red-900/80 text-zinc-400 hover:text-white"
                                    >
                                        <TrashIcon />
                                    </button>
                                    
                                    {/* Color Picker Popover */}
                                    {colorPickerTrackId === track.id && (
                                        <div 
                                            className="absolute top-8 right-0 z-50 bg-zinc-900 border border-zinc-700 p-2 rounded-lg shadow-xl flex flex-col gap-2 w-48"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Standard Colors Grid */}
                                            <div className="grid grid-cols-5 gap-1">
                                                {TRACK_COLORS.map(c => (
                                                    <button 
                                                        key={c} 
                                                        className="w-6 h-6 rounded-full ring-1 ring-white/10 hover:scale-110 transition"
                                                        style={{ backgroundColor: c }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onColorChange(track.id, c);
                                                            setColorPickerTrackId(null);
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Custom Colors Row (Persistent) */}
                                            {customColors.length > 0 && (
                                                <div className="grid grid-cols-5 gap-1 pt-2 border-t border-zinc-800">
                                                    {customColors.map((c, i) => (
                                                        <button 
                                                            key={`${c}-${i}`} 
                                                            className="w-6 h-6 rounded-full ring-1 ring-white/10 hover:scale-110 transition"
                                                            style={{ backgroundColor: c }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onColorChange(track.id, c);
                                                                setColorPickerTrackId(null);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Custom Color Button / Input */}
                                            <div className="pt-2 border-t border-zinc-800">
                                                {!showCustomColorPicker ? (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowCustomColorPicker(true);
                                                        }}
                                                        className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded group transition"
                                                    >
                                                        <div className="w-4 h-4 rounded-full shadow-sm ring-1 ring-white/20 shrink-0" style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)' }} />
                                                        <span className="text-[10px] text-zinc-300 font-bold group-hover:text-white">Custom Color</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200 items-center p-2">
                                                        <div className="flex items-center justify-between w-full mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full shadow-sm ring-1 ring-white/20 shrink-0" style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)' }} />
                                                                <span className="text-[10px] text-white font-bold">Pick Color</span>
                                                            </div>
                                                            <button onClick={() => setShowCustomColorPicker(false)} className="text-zinc-500 hover:text-white text-[10px]">✕</button>
                                                        </div>
                                                        
                                                        {/* Interactive Color Wheel */}
                                                        <div 
                                                            ref={colorWheelRef}
                                                            className="relative w-32 h-32 rounded-full shadow-xl ring-2 ring-white/10 overflow-hidden cursor-crosshair touch-none select-none active:scale-95 transition-transform"
                                                            onPointerDown={(e) => handleWheelPointerDown(e, track.id)}
                                                            onPointerMove={(e) => handleWheelPointerMove(e, track.id)}
                                                            onPointerUp={(e) => handleWheelPointerUp(e, track.id)}
                                                        >
                                                            <div className="absolute inset-0" style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)' }} />
                                                            <div className="absolute inset-0" style={{ background: 'radial-gradient(closest-side, white, transparent)' }} />
                                                        </div>
                                                        <div className="text-[9px] text-zinc-500 mt-2 font-medium">Tap or drag to preview</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div> 
                            )}
                            <div className="absolute left-2 top-1 z-10 flex items-center gap-2 pointer-events-none max-w-full overflow-hidden"><span className="text-[10px] font-bold text-zinc-300 shadow-black drop-shadow-md truncate">{track.name}</span>{track.crossfadeMetadata && <span className="text-[9px] px-1 bg-cyan-900/50 rounded text-cyan-300">Linked</span>}</div>
                            <div className={`absolute inset-x-0 bottom-0 top-0 pt-5 ${isTrimActive ? 'overflow-hidden ring-2 ring-yellow-400/50 bg-yellow-900/10' : ''} ${isAutomationActive ? 'ring-2 ring-yellow-400/30' : ''}`}>
                                <div className="h-full absolute top-0 left-0 w-full pt-5">
                                    <WaveformDisplay 
                                        buffer={track.buffer} 
                                        startTime={visualStartTime} 
                                        trimStart={visualTrimStart} 
                                        duration={visualDuration} 
                                        currentTime={currentTime} 
                                        selection={isSelected ? selection : null} 
                                        onSelectionChange={onSelectionChange} 
                                        color={track.color} 
                                        zoom={zoom} 
                                        fadeInDuration={fadeInDuration} 
                                        fadeOutDuration={fadeOutDuration} 
                                        height={waveformHeight - 20}
                                        automationPoints={track.volumeAutomation}
                                        showAutomationHandles={isAutomationActive}
                                        isLooping={track.isLooping}
                                    />
                                </div>
                                {isTrimActive && ( 
                                    <>
                                        {/* Left Handle */}
                                        <div 
                                            className={`absolute top-0 bottom-0 left-0 w-8 backdrop-blur-sm rounded-l-md cursor-ew-resize z-50 shadow-lg touch-none overflow-hidden bg-yellow-400 ring-1 ring-black/10 group pt-5`} 
                                            onPointerDown={(e) => onTrimPointerDown(e, track, 'start')} 
                                            onPointerUp={(e) => onTrimPointerUp(e, track)}
                                        >
                                            {isLeftDragging ? ( 
                                                <div className="absolute inset-0 pointer-events-none opacity-90 pt-5">
                                                    <WaveformDisplay buffer={track.buffer} startTime={0} trimStart={visualTrimStart} duration={handleDuration} currentTime={-1} selection={null} onSelectionChange={() => {}} color="" colorOverride="#000000" backgroundColor="#facc15" zoom={zoom} fadeInDuration={fadeInDuration} fadeOutDuration={fadeOutDuration} height={waveformHeight - 20} isLooping={track.isLooping} />
                                                </div> 
                                            ) : ( 
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-black">
                                                    <ChevronLeftIcon />
                                                </div> 
                                            )}
                                        </div>
                                        
                                        {/* Right Handle */}
                                        <div 
                                            className={`absolute top-0 bottom-0 right-0 w-8 backdrop-blur-sm rounded-r-md cursor-ew-resize z-50 shadow-lg touch-none overflow-hidden bg-yellow-400 ring-1 ring-black/10 group pt-5`} 
                                            onPointerDown={(e) => onTrimPointerDown(e, track, 'end')} 
                                            onPointerUp={(e) => onTrimPointerUp(e, track)}
                                        >
                                            {isRightDragging ? ( 
                                                <div className="absolute inset-0 pointer-events-none opacity-90 pt-5">
                                                    <WaveformDisplay buffer={track.buffer} startTime={0} trimStart={visualTrimStart + visualDuration - handleDuration} duration={handleDuration} currentTime={-1} selection={null} onSelectionChange={() => {}} color="" colorOverride="#000000" backgroundColor="#facc15" zoom={zoom} fadeInDuration={fadeInDuration} fadeOutDuration={fadeOutDuration} height={waveformHeight - 20} isLooping={track.isLooping} />
                                                </div> 
                                            ) : ( 
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-black">
                                                    <ChevronRightIcon />
                                                </div> 
                                            )}
                                        </div>
                                    </> 
                                )}
                            </div>
                            {isInteractive && ( <>{interactiveMode?.type === 'fadeIn' && ( <><svg className="absolute inset-x-0 bottom-0 top-5 pointer-events-none z-50 overflow-visible" style={{ height: '100%' }}><polygon points={`0,0 ${fadeInDuration * zoom},0 0,${overlayHeight}`} fill="rgba(250, 204, 21, 0.2)"/><line x1="0" y1={overlayHeight} x2={fadeInDuration * zoom} y2="0" stroke="#facc15" strokeWidth="2"/></svg><div className="fade-handle absolute top-0 h-5 w-6 z-[60] cursor-grab active:cursor-grabbing touch-none flex flex-col items-center justify-end" style={{ left: `${fadeInDuration * zoom - 12}px` }} onPointerDown={onFadeHandlePointerDown}><div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-yellow-400 drop-shadow-md hover:scale-110 transition-transform mb-0.5" /></div></> )}{interactiveMode?.type === 'fadeOut' && ( <><svg className="absolute inset-x-0 bottom-0 top-5 pointer-events-none z-50 overflow-visible" style={{ height: '100%' }}><polygon points={`${(visualDuration - fadeOutDuration) * zoom},0 ${visualDuration * zoom},0 ${visualDuration * zoom},${overlayHeight}`} fill="rgba(250, 204, 21, 0.2)"/><line x1={(visualDuration - fadeOutDuration) * zoom} y1="0" x2={visualDuration * zoom} y2={overlayHeight} stroke="#facc15" strokeWidth="2"/></svg><div className="fade-handle absolute top-0 h-5 w-6 z-[60] cursor-grab active:cursor-grabbing touch-none flex flex-col items-center justify-end" style={{ left: `${(visualDuration - fadeOutDuration) * zoom - 12}px` }} onPointerDown={onFadeHandlePointerDown}><div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-yellow-400 drop-shadow-md hover:scale-110 transition-transform mb-0.5" /></div></> )}</> )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
});
