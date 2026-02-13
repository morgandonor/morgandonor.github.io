
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { generateDrumBeat, generateSynthSequence, playBuffer, getAudioContext } from '../services/audioUtils';

interface BeatMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (buffer: AudioBuffer, name: string) => void;
  initialBpm?: number;
}

const DrumIcon = () => (
    <svg className="w-5 h-5 text-zinc-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14a2 2 0 012 2v1H3v-1a2 2 0 012-2zm0-6h14l1.5 5H3.5L5 14zm0-9a3 3 0 016 0v2H5V5zm8 0a3 3 0 016 0v2h-6V5z"/>
    </svg>
);

const SynthIcon = () => (
    <svg className="w-5 h-5 text-zinc-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
);

const BeatMakerModal: React.FC<BeatMakerModalProps> = ({ isOpen, onClose, onGenerate, initialBpm = 120 }) => {
  const [activeTab, setActiveTab] = useState<'drums' | 'synth'>('drums');
  const [bpm, setBpm] = useState(initialBpm);
  const [bars, setBars] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);

  // Drums State
  const [style, setStyle] = useState('Rock');

  // Synth State
  const [preset, setPreset] = useState('Analog Bass');
  const [patternType, setPatternType] = useState('Bassline');
  const [rootNote, setRootNote] = useState('C');
  const [scaleType, setScaleType] = useState<'Major' | 'Minor'>('Minor');

  // Preview Debounce
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxBars = Math.floor(bpm / 4);
  const currentDuration = bars * 4 * (60 / bpm);

  useEffect(() => {
      if (initialBpm) setBpm(initialBpm);
  }, [initialBpm, isOpen]);

  useEffect(() => {
      if (bars > maxBars) setBars(maxBars);
  }, [bpm, maxBars, bars]);

  // Auto-preview when synth parameters change
  useEffect(() => {
      if (!isOpen || activeTab !== 'synth') return;

      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

      previewTimeoutRef.current = setTimeout(async () => {
          // Resume context if suspended (common on first interaction)
          const ctx = getAudioContext();
          if (ctx.state === 'suspended') await ctx.resume();

          // Generate a short 1-bar preview
          try {
              const buffer = await generateSynthSequence(preset, patternType, rootNote, scaleType, bpm, 1);
              playBuffer(buffer);
          } catch(e) {
              console.error("Preview generation failed", e);
          }
      }, 200); // 200ms debounce

      return () => {
          if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      };
  }, [preset, patternType, rootNote, scaleType, bpm, isOpen, activeTab]);

  if (!isOpen) return null;

  const drumStyles = ['Rock', 'HipHop', 'Techno', 'Metronome'];
  
  const synthPresets = ['Analog Bass', 'Chiptune Lead', 'Dreamy Pad', 'Pluck', 'Electric Piano', 'Saw Lead', 'Strings', 'Glitch Bass'];
  const synthPatterns = ['One Shot', 'Bassline', 'Arpeggio', 'Random Melody', 'Chords'];
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setTimeout(async () => {
        try {
            let buffer: AudioBuffer;
            let name: string;

            if (activeTab === 'drums') {
                buffer = await generateDrumBeat(style, bpm, bars);
                name = `${style} Beat (${bpm} BPM)`;
            } else {
                // Synth Generation
                buffer = await generateSynthSequence(preset, patternType, rootNote, scaleType, bpm, bars);
                name = `${preset} ${patternType} ${rootNote}${scaleType === 'Minor' ? 'm' : ''} (${bpm} BPM)`;
            }
            
            onGenerate(buffer, name);
            onClose();
        } catch(e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 landscape:p-2 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 landscape:p-4 shadow-2xl space-y-4 landscape:space-y-2 landscape:max-h-[95vh] landscape:overflow-y-auto no-scrollbar flex flex-col">
        
        {/* Header Tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button 
                onClick={() => setActiveTab('drums')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'drums' ? 'bg-zinc-800 text-cyan-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <DrumIcon /> Beat
            </button>
            <button 
                onClick={() => setActiveTab('synth')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'synth' ? 'bg-zinc-800 text-cyan-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <SynthIcon /> Synth
            </button>
        </div>
        
        {/* Content */}
        <div className="space-y-4 landscape:space-y-2 flex-1">
            
            {activeTab === 'drums' ? (
                // --- Drum Controls ---
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {drumStyles.map(s => (
                            <button
                                key={s}
                                onClick={() => setStyle(s)}
                                className={`p-3 landscape:p-2 rounded-lg text-sm font-medium transition ${style === s ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                // --- Synth Controls ---
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Instrument</label>
                        <select 
                            value={preset} 
                            onChange={(e) => setPreset(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            {synthPresets.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Pattern</label>
                        <select 
                            value={patternType} 
                            onChange={(e) => setPatternType(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            {synthPatterns.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Key</label>
                            <select 
                                value={rootNote} 
                                onChange={(e) => setRootNote(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                            >
                                {notes.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Scale</label>
                            <div className="flex bg-zinc-800 rounded-lg border border-zinc-700 p-0.5">
                                <button onClick={() => setScaleType('Major')} className={`flex-1 rounded py-1.5 text-xs font-bold ${scaleType === 'Major' ? 'bg-cyan-600 text-white' : 'text-zinc-400'}`}>Maj</button>
                                <button onClick={() => setScaleType('Minor')} className={`flex-1 rounded py-1.5 text-xs font-bold ${scaleType === 'Minor' ? 'bg-cyan-600 text-white' : 'text-zinc-400'}`}>Min</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Shared Controls: BPM & Bars */}
            <div className="pt-2 border-t border-zinc-800 space-y-3">
                <div className="space-y-2">
                     <div className="flex justify-between">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Tempo</label>
                        <span className={`text-xs font-bold text-cyan-400`}>{bpm} BPM</span>
                     </div>
                     <input 
                        type="range" 
                        min="60" 
                        max="200" 
                        value={bpm} 
                        onChange={(e) => setBpm(parseInt(e.target.value))}
                        className={`w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500`}
                     />
                </div>

                 <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Length</label>
                        <div className="text-right">
                            <span className={`text-xs font-bold text-cyan-400`}>{bars} Bars</span>
                            <span className="text-[10px] text-zinc-500 font-medium ml-2">({currentDuration.toFixed(1)}s)</span>
                        </div>
                     </div>
                     <input 
                        type="range" 
                        min="1" 
                        max={maxBars} 
                        value={bars} 
                        onChange={(e) => setBars(parseInt(e.target.value))}
                        className={`w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500`}
                     />
                </div>
            </div>
        </div>

        <div className="flex gap-3 pt-4 landscape:pt-2 border-t border-zinc-800 shrink-0">
          <Button variant="ghost" onClick={onClose} label="Cancel" />
          <Button 
            variant="primary" 
            onClick={handleGenerate} 
            disabled={isGenerating}
            label={isGenerating ? "Synthesizing..." : (activeTab === 'drums' ? "Generate Beat" : "Generate Synth")}
            className={`flex-1 ${activeTab === 'synth' ? '!bg-cyan-600 !shadow-cyan-500/20 hover:!bg-cyan-500' : ''}`}
          />
        </div>
      </div>
    </div>
  );
};

export default BeatMakerModal;
