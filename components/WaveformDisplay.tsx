
import React, { useRef, useEffect } from 'react';
import { SELECTION_COLOR } from '../constants';
import { SelectionRange, AutomationPoint } from '../types';

interface WaveformDisplayProps {
  buffer: AudioBuffer | null;
  currentTime: number; // Global time
  startTime: number; // Track start time offset (timeline)
  trimStart: number; // Start offset within buffer
  duration: number; // Visual duration
  selection: SelectionRange | null;
  color: string;
  zoom: number; // pixels per second
  onSelectionChange: (selection: SelectionRange | null) => void;
  colorOverride?: string | null;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  height?: number;
  automationPoints?: AutomationPoint[];
  showAutomationHandles?: boolean;
  isLooping?: boolean;
  backgroundColor?: string;
}

const TILE_SIZE = 2048; // Max width per canvas tile (safe for mobile)

const darkenColor = (hex: string, percent: number) => {
    let num = parseInt(hex.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
};

interface TileProps extends WaveformDisplayProps {
    tileIndex: number;
    totalWidth: number;
}

const WaveformTile: React.FC<TileProps> = React.memo(({
    tileIndex, totalWidth, buffer, startTime, trimStart, duration, selection, color, zoom,
    colorOverride, fadeInDuration = 0, fadeOutDuration = 0, height = 80,
    automationPoints, showAutomationHandles, isLooping, backgroundColor = '#18181b'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const tileX = tileIndex * TILE_SIZE;
    const tileWidth = Math.min(TILE_SIZE, totalWidth - tileX);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { alpha: false });
        if (!canvas || !ctx || !buffer) return;

        const dpr = window.devicePixelRatio || 1;
        const physicalWidth = Math.floor(tileWidth * dpr);
        const physicalHeight = Math.floor(height * dpr);

        if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
            canvas.width = physicalWidth;
            canvas.height = physicalHeight;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // Clear Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, tileWidth, height);

        // --- Waveform Drawing ---
        const data = buffer.getChannelData(0);
        const bufferLength = data.length;
        const amp = height / 2;

        if (colorOverride) {
            ctx.fillStyle = colorOverride;
        } else {
            try {
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, color); 
                gradient.addColorStop(1, darkenColor(color, 40)); 
                ctx.fillStyle = gradient;
            } catch (e) {
                ctx.fillStyle = color;
            }
        }

        ctx.beginPath();

        // Calculate Time Offsets for this Tile
        const tileStartTimeOffset = tileX / zoom; // Seconds into the track visually
        const secondsPerPixel = 1 / zoom;
        const samplesPerPixel = Math.max(1, Math.floor(secondsPerPixel * buffer.sampleRate));
        const innerStride = Math.max(1, Math.floor(samplesPerPixel / 200)); 

        // Sorting automation points once (could be optimized to prop)
        let sortedPoints: AutomationPoint[] = [];
        if (automationPoints && automationPoints.length > 0) {
            sortedPoints = [...automationPoints].sort((a, b) => a.time - b.time);
        }

        for (let i = 0; i < tileWidth; i++) {
            // RelTime is time relative to the Track Start
            const relTime = tileStartTimeOffset + (i * secondsPerPixel);
            const bufferTime = trimStart + relTime; // Time inside the audio buffer

            let min = 1.0;
            let max = -1.0;

            const pixelStartIndex = Math.floor(bufferTime * buffer.sampleRate);

            for (let j = 0; j < samplesPerPixel; j += innerStride) {
                let idx = pixelStartIndex + j;
                if (isLooping) {
                    idx = idx % bufferLength;
                    if (idx < 0) idx += bufferLength;
                } else if (idx >= bufferLength) {
                    break;
                }
                const datum = data[idx];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            if (min === 1.0 && max === -1.0) { min = 0; max = 0; }
            min = Math.max(-1, min);
            max = Math.min(1, max);

            // --- Apply Gain (Fades & Automation) ---
            let gain = 1.0;

            // Automation
            if (sortedPoints.length > 0) {
                // Find points surrounding bufferTime
                // Simple linear search is fast enough for per-pixel in this context
                let p1 = sortedPoints[0];
                let p2 = sortedPoints[0];
                
                for(let k=0; k<sortedPoints.length-1; k++) {
                    if (bufferTime >= sortedPoints[k].time && bufferTime <= sortedPoints[k+1].time) {
                        p1 = sortedPoints[k];
                        p2 = sortedPoints[k+1];
                        break;
                    }
                }
                
                if (bufferTime >= sortedPoints[sortedPoints.length-1].time) {
                    p1 = sortedPoints[sortedPoints.length-1];
                    p2 = p1;
                }

                if (p1 === p2) {
                    gain *= p1.value;
                } else {
                    const range = p2.time - p1.time;
                    const progress = (bufferTime - p1.time) / range;
                    gain *= p1.value + (p2.value - p1.value) * progress;
                }
            }

            // Fades
            if (fadeInDuration > 0 && relTime < fadeInDuration) {
                gain *= (relTime / fadeInDuration);
            }
            if (fadeOutDuration > 0 && relTime > (duration - fadeOutDuration)) {
                const timeFromEnd = duration - relTime;
                gain *= (timeFromEnd / fadeOutDuration);
            }

            gain = Math.max(0, Math.min(1, gain));
            min *= gain;
            max *= gain;

            const yTop = Math.floor((1 + min) * amp);
            const yBottom = Math.ceil((1 + max) * amp);
            const barHeight = Math.max(1, yBottom - yTop);

            ctx.fillRect(i, yTop, 1, barHeight);
        }

        // --- Draw Selection ---
        if (selection) {
            const trackEnd = startTime + duration;
            const tileStartGlobal = startTime + tileStartTimeOffset;
            const tileEndGlobal = tileStartGlobal + (tileWidth / zoom);

            // Check overlap
            if (selection.end > tileStartGlobal && selection.start < tileEndGlobal) {
                // Calculate local pixels
                const selStartLocal = Math.max(0, (selection.start - tileStartGlobal) * zoom);
                const selEndLocal = Math.min(tileWidth, (selection.end - tileStartGlobal) * zoom);

                ctx.fillStyle = SELECTION_COLOR;
                ctx.fillRect(selStartLocal, 0, selEndLocal - selStartLocal, height);
                
                // Handles
                ctx.fillStyle = '#fff';
                if (selection.start >= tileStartGlobal && selection.start < tileEndGlobal) {
                    ctx.fillRect(selStartLocal, 0, 1, height);
                }
                if (selection.end > tileStartGlobal && selection.end <= tileEndGlobal) {
                    ctx.fillRect(selEndLocal - (selEndLocal === tileWidth ? 1 : 0), 0, 1, height);
                }
            }
        }

        // --- Draw Automation Lines ---
        if (showAutomationHandles && sortedPoints.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;

            // Filter points relevant to this tile (plus one before/after for connectivity)
            const tileStartTimeRel = tileStartTimeOffset;
            const tileEndTimeRel = tileStartTimeOffset + (tileWidth / zoom);
            
            // We need to draw lines. We can just iterate all points and project them.
            // Canvas clipping handles the rest.
            let hasMoved = false;
            sortedPoints.forEach((p, idx) => {
                const px = (p.time - trimStart) * zoom - tileX;
                const py = (1 - p.value) * height;
                
                // Optimization: Skip points far outside
                if (px < -100 && idx < sortedPoints.length -1 && (sortedPoints[idx+1].time - trimStart)*zoom - tileX < -100) return;
                if (px > tileWidth + 100 && idx > 0 && (sortedPoints[idx-1].time - trimStart)*zoom - tileX > tileWidth + 100) return;

                if (!hasMoved) {
                    ctx.moveTo(px, py);
                    hasMoved = true;
                } else {
                    ctx.lineTo(px, py);
                }
            });
            ctx.stroke();

            // Draw Dots
            ctx.fillStyle = '#facc15';
            sortedPoints.forEach(p => {
                const px = (p.time - trimStart) * zoom - tileX;
                const py = (1 - p.value) * height;
                if (px >= -4 && px <= tileWidth + 4) {
                    ctx.beginPath();
                    ctx.arc(px, py, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        }

    }, [buffer, startTime, trimStart, duration, selection, color, zoom, colorOverride, fadeInDuration, fadeOutDuration, height, automationPoints, showAutomationHandles, isLooping, backgroundColor, tileIndex, tileWidth, tileX]);

    return (
        <canvas 
            ref={canvasRef} 
            style={{ 
                position: 'absolute',
                left: `${tileX}px`,
                top: 0,
                width: `${tileWidth}px`, 
                height: '100%' 
            }} 
        />
    );
});

const WaveformDisplay: React.FC<WaveformDisplayProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate total visual width
  const totalWidth = Math.ceil(props.duration * props.zoom);
  const tileCount = Math.ceil(totalWidth / TILE_SIZE);

  return (
    <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%', position: 'relative' }}
        className={`shrink-0 rounded-lg overflow-hidden ${props.colorOverride ? '' : 'ring-1 ring-white/5'}`}
    >
        {/* Render Tiles */}
        {Array.from({ length: tileCount }).map((_, i) => (
            <WaveformTile 
                key={i} 
                tileIndex={i} 
                totalWidth={totalWidth} 
                {...props} 
            />
        ))}
    </div>
  );
};

export default WaveformDisplay;
