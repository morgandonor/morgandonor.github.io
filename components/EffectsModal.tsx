
import React, { useState } from 'react';
import Button from './Button';
import { ActiveEffects } from '../types';

interface EffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (effect: string, params?: any) => void;
  activeEffects?: ActiveEffects;
  isCrossfaded?: boolean;
  currentVolume?: number; // Add current volume prop
  trackBpm?: number;
}

// Icons
const EqualizerIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
);

const NormalizeIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const ReverseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
);

const SpeedIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const VolumeIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

const CrossfadeIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 19c-1.5 0-3-1-4-3l-6-8c-1-2-2.5-3-4-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19c1.5 0 3-1 4-3l6-8c1-2 2.5-3 4-3" />
    </svg>
);

const EffectsModal: React.FC<EffectsModalProps> = ({ isOpen, onClose, onApply, activeEffects, isCrossfaded, currentVolume = 1.0, trackBpm }) => {
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState<string>('');
  
  // Dedicated state for Speed Menu
  const [pendingSpeed, setPendingSpeed] = useState<number>(1.0);
  const [preservePitch, setPreservePitch] = useState<boolean>(false);

  if (!isOpen) return null;

  const effects = [
    { id: 'fadeIn', label: 'Fade In', icon: '◢', isSubmenu: true },
    { id: 'fadeOut', label: 'Fade Out', icon: '◣', isSubmenu: true },
    { id: 'crossfade', label: 'Crossfade', icon: <CrossfadeIcon />, isSubmenu: true },
    { id: 'eq', label: 'EQ', icon: <EqualizerIcon />, isSubmenu: true },
    { id: 'normalize', label: 'Normalize', icon: <NormalizeIcon />, isSubmenu: false },
    { id: 'reverse', label: 'Reverse', icon: <ReverseIcon />, isSubmenu: false },
    { id: 'speed', label: 'Speed', icon: <SpeedIcon />, isSubmenu: true },
    { id: 'volume', label: 'Volume', icon: <VolumeIcon />, isSubmenu: true },
  ];

  const eqPresets = [
      'Bass Boost',
      'Treble Boost',
      'Bass Cut',
      'Treble Cut',
      'Mid Boost',
      'V-Shape',
      'Lo-Fi Radio',
      'Telephone'
  ];

  const checkActive = (id: string): boolean => {
      if (id === 'fadeIn') return !!activeEffects?.fadeIn;
      if (id === 'fadeOut') return !!activeEffects?.fadeOut;
      if (id === 'crossfade') return !!isCrossfaded;
      if (id === 'normalize') return !!activeEffects?.normalize;
      if (id === 'reverse') return !!activeEffects?.reverse;
      if (id === 'eq') return !!activeEffects?.eqPreset;
      if (id === 'speed') return !!activeEffects?.playbackRate && activeEffects.playbackRate !== 1.0;
      if (id === 'volume') {
          const vol = typeof currentVolume === 'number' ? currentVolume : 1.0;
          return Math.abs(vol - 1.0) > 0.01; // Active if not 100%
      }
      return false;
  };

  const handleEffectClick = (fx: any) => {
      const isActive = checkActive(fx.id);

      if (fx.isSubmenu) {
          setSelectedEffectId(fx.id);
          // Set default custom values
          if (fx.id === 'speed') {
              setPendingSpeed(activeEffects?.playbackRate || 1.0);
              setPreservePitch(!!activeEffects?.preservePitch);
          } else if (fx.id === 'volume') {
              setCustomValue(Math.round(currentVolume * 100).toString());
          } else if (fx.id === 'fadeIn' || fx.id === 'fadeOut') {
              setCustomValue('3.0');
          } else {
              setCustomValue('');
          }
      } else {
          // For toggles (Normalize, Reverse)
          if (isActive) {
              onApply(fx.id, { restore: true });
          } else {
              onApply(fx.id, { toggle: true });
          }
          onClose();
      }
  };

  const handleApplyWithDuration = (duration: number) => {
      if (selectedEffectId) {
          onApply(selectedEffectId, { duration });
          onClose();
          setSelectedEffectId(null);
      }
  };

  const handleApplyPreset = (preset: string) => {
      if (selectedEffectId) {
          onApply(selectedEffectId, { preset });
          onClose();
          setSelectedEffectId(null);
      }
  };

  const handleApplyVolume = (percent: number) => {
      if (selectedEffectId) {
          onApply(selectedEffectId, { level: percent / 100 });
          onClose();
          setSelectedEffectId(null);
      }
  };

  const handleInteractive = () => {
      if (selectedEffectId) {
          onApply(selectedEffectId, { interactive: true });
          onClose();
          setSelectedEffectId(null);
      }
  };
  
  const handleAutomation = () => {
      if (selectedEffectId) {
          onApply(selectedEffectId, { automation: true });
          onClose();
          setSelectedEffectId(null);
      }
  };

  const handleRestore = () => {
      if (selectedEffectId) {
          onApply(selectedEffectId, { restore: true });
          onClose();
          setSelectedEffectId(null);
      }
  };

  // Common modal container class - Aggressively compacted for landscape
  const modalContainerClass = "bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 landscape:p-2 shadow-2xl space-y-4 landscape:space-y-1 mb-4 sm:mb-0 landscape:mb-0 landscape:max-h-[95vh] landscape:overflow-y-auto no-scrollbar";
  const modalOverlayClass = "fixed inset-0 z-50 flex items-end sm:items-center landscape:items-center justify-center bg-black/80 backdrop-blur-sm p-4 landscape:p-2 animate-in fade-in duration-200";

  // --- Sub-menu for EQ ---
  if (selectedEffectId === 'eq') {
      return (
        <div className={modalOverlayClass}>
            <div className={modalContainerClass}>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2 landscape:pb-1">
                    <h2 className="text-lg font-bold text-white">Select EQ Preset</h2>
                    <div className="flex gap-2">
                        {checkActive('eq') && (
                            <button onClick={handleRestore} className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded hover:bg-red-900/50">Remove</button>
                        )}
                        <button onClick={() => setSelectedEffectId(null)} className="text-zinc-500 hover:text-white text-sm">Back</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 landscape:gap-1 max-h-[300px] overflow-y-auto no-scrollbar">
                    {eqPresets.map(preset => (
                        <button 
                            key={preset}
                            onClick={() => handleApplyPreset(preset)}
                            className={`py-3 px-2 landscape:py-1.5 rounded-lg transition font-medium text-sm ${activeEffects?.eqPreset === preset ? 'bg-cyan-900/50 text-cyan-400 ring-1 ring-cyan-500' : 'bg-zinc-800 text-zinc-300 hover:bg-cyan-900/30'}`}
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // --- Sub-menu for Fades ---
  if (selectedEffectId === 'fadeIn' || selectedEffectId === 'fadeOut' || selectedEffectId === 'crossfade') {
      const isFade = selectedEffectId !== 'crossfade';
      
      return (
        <div className={modalOverlayClass}>
            <div className={modalContainerClass}>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2 landscape:pb-1 h-10 landscape:h-8">
                    <h2 className="text-lg font-bold text-white">Select Duration</h2>
                    {isFade && (
                        <button 
                            onClick={handleInteractive} 
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1 rounded-md font-bold text-lg landscape:text-sm shadow-lg shadow-yellow-500/20 transition active:scale-95"
                        >
                            Slider
                        </button>
                    )}
                    <div className="flex gap-2">
                        {checkActive(selectedEffectId) && (
                            <button onClick={handleRestore} className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded hover:bg-red-900/50">Remove</button>
                        )}
                        <button onClick={() => setSelectedEffectId(null)} className="text-zinc-500 hover:text-white text-sm">Back</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 landscape:gap-1">
                    {[0.25, 0.5, 1.0, 2.0, 3.0, 5.0].map(d => (
                        <button 
                            key={d}
                            onClick={() => handleApplyWithDuration(d)}
                            className="py-3 landscape:py-1.5 bg-zinc-800 rounded-lg hover:bg-cyan-900/50 hover:text-cyan-400 transition font-medium"
                        >
                            {d}s
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 items-center pt-2 landscape:pt-1">
                     <span className="text-xs text-zinc-500 uppercase font-bold">Custom:</span>
                     <input 
                        type="number" 
                        value={customValue} 
                        onChange={(e) => setCustomValue(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 landscape:py-0.5 w-20 text-center focus:ring-2 focus:ring-cyan-500 outline-none" 
                     />
                     <span className="text-zinc-500">s</span>
                     <Button 
                        variant="primary" 
                        label="Apply" 
                        onClick={() => handleApplyWithDuration(parseFloat(customValue) || 1)} 
                        className="py-1 px-3 text-sm h-8 ml-auto"
                    />
                </div>
            </div>
        </div>
      );
  }

  // --- Sub-menu for Speed ---
  if (selectedEffectId === 'speed') {
      const presets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const currentBpm = trackBpm || 0;
      const targetBpm = currentBpm ? Math.round(currentBpm * pendingSpeed) : 0;

      return (
        <div className={modalOverlayClass}>
            <div className={modalContainerClass}>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2 landscape:pb-1">
                    <h2 className="text-lg font-bold text-white">Playback Speed</h2>
                    <div className="flex gap-2">
                         {checkActive('speed') && (
                            <button onClick={handleRestore} className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded hover:bg-red-900/50">Reset</button>
                        )}
                        <button onClick={() => setSelectedEffectId(null)} className="text-zinc-500 hover:text-white text-sm">Back</button>
                    </div>
                </div>
                
                {/* BPM & Speed Controls */}
                <div className="bg-zinc-800/50 rounded-xl p-3 space-y-3">
                    {currentBpm > 0 && (
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">Original BPM</span>
                                <span className="text-zinc-400 font-mono text-sm">{currentBpm}</span>
                            </div>
                            <div className="flex flex-col items-end flex-1">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">Target BPM</span>
                                <input
                                    type="number"
                                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 w-20 text-right font-mono text-cyan-400 focus:ring-1 focus:ring-cyan-500 outline-none"
                                    value={targetBpm || ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val > 0) setPendingSpeed(val / currentBpm);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">Speed Multiplier</span>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.05"
                                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 w-20 text-right font-mono text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                                value={parseFloat(pendingSpeed.toFixed(2))}
                                onChange={(e) => setPendingSpeed(parseFloat(e.target.value) || 1)}
                            />
                            <span className="text-zinc-500 text-xs">x</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer group select-none">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${preservePitch ? 'bg-cyan-600' : 'bg-zinc-700'}`}>
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-md ${preservePitch ? 'left-6' : 'left-1'}`} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-sm font-medium transition ${preservePitch ? 'text-cyan-400' : 'text-zinc-400'}`}>Time Stretch</span>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase leading-none">Preserve Pitch</span>
                            </div>
                            <input type="checkbox" className="hidden" checked={preservePitch} onChange={(e) => setPreservePitch(e.target.checked)} />
                        </label>
                    </div>
                </div>
                
                {/* Presets */}
                <div className="grid grid-cols-3 gap-2 landscape:gap-1">
                    {presets.map(rate => (
                        <button 
                            key={rate}
                            onClick={() => setPendingSpeed(rate)}
                            className={`py-2 landscape:py-1.5 bg-zinc-800 rounded-lg hover:bg-cyan-900/50 hover:text-cyan-400 transition font-medium text-sm ${Math.abs(pendingSpeed - rate) < 0.01 ? 'bg-cyan-900/50 text-cyan-400 ring-1 ring-cyan-500' : ''}`}
                        >
                            {rate}x
                        </button>
                    ))}
                </div>

                {/* Apply Actions */}
                <div className="flex gap-2 pt-2 landscape:pt-1">
                     <Button 
                        variant="secondary" 
                        label="Reset" 
                        onClick={() => { setPendingSpeed(1.0); setPreservePitch(false); }} 
                        className="flex-1 h-10"
                    />
                     <Button 
                        variant="primary" 
                        label="Apply" 
                        onClick={() => {
                            onApply('speed', { playbackRate: pendingSpeed, preservePitch });
                            onClose();
                            setSelectedEffectId(null);
                        }} 
                        className="flex-[2] h-10"
                    />
                </div>
            </div>
        </div>
      );
  }

  // --- Sub-menu for Volume ---
  if (selectedEffectId === 'volume') {
      const presets = [25, 50, 75, 100, 125, 150];

      return (
        <div className={modalOverlayClass}>
            <div className={modalContainerClass}>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2 landscape:pb-1">
                    <h2 className="text-lg font-bold text-white">Track Volume</h2>
                    <button 
                        onClick={handleAutomation} 
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1 rounded-md font-bold text-sm shadow-lg shadow-yellow-500/20 transition active:scale-95"
                    >
                        Draw Automation
                    </button>
                    <div className="flex gap-2">
                         {checkActive('volume') && (
                            <button onClick={() => handleApplyVolume(100)} className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded hover:bg-red-900/50">Reset</button>
                        )}
                        <button onClick={() => setSelectedEffectId(null)} className="text-zinc-500 hover:text-white text-sm">Back</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 landscape:gap-1">
                    {presets.map(percent => (
                        <button 
                            key={percent}
                            onClick={() => handleApplyVolume(percent)}
                            className={`py-3 landscape:py-1.5 bg-zinc-800 rounded-lg hover:bg-cyan-900/50 hover:text-cyan-400 transition font-medium ${Math.round(currentVolume * 100) === percent ? 'bg-cyan-900/50 text-cyan-400 ring-1 ring-cyan-500' : ''}`}
                        >
                            {percent}%
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 items-center pt-2 landscape:pt-1">
                     <span className="text-xs text-zinc-500 uppercase font-bold">Custom:</span>
                     <input 
                        type="number" 
                        value={customValue} 
                        onChange={(e) => setCustomValue(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 landscape:py-0.5 w-20 text-center focus:ring-2 focus:ring-cyan-500 outline-none" 
                     />
                     <span className="text-zinc-500">%</span>
                     <Button 
                        variant="primary" 
                        label="Apply" 
                        onClick={() => handleApplyVolume(parseFloat(customValue) || 100)} 
                        className="py-1 px-3 text-sm h-8 ml-auto"
                    />
                </div>
            </div>
        </div>
      );
  }

  // --- Main Menu ---
  return (
    <div className={modalOverlayClass}>
      <div className={modalContainerClass}>
        <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-white">Creative Effects</h2>
             <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm">Back</button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 landscape:gap-1.5">
            {effects.map((fx) => {
                const isActive = checkActive(fx.id);
                               
                return (
                    <button
                        key={fx.id}
                        onClick={() => handleEffectClick(fx)}
                        className={`flex flex-col items-center justify-center gap-2 landscape:gap-1 p-4 landscape:p-2 rounded-xl transition border group ${isActive ? 'bg-cyan-900/30 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-zinc-800/50 hover:bg-zinc-700 border-transparent hover:border-cyan-500/30'}`}
                    >
                        <span className={`text-2xl landscape:text-xl transition ${isActive ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-zinc-200 group-hover:scale-110'}`}>{fx.icon}</span>
                        <span className={`text-sm landscape:text-xs font-medium ${isActive ? 'text-cyan-400 font-bold' : 'text-zinc-300 group-hover:text-cyan-400'}`}>{fx.label}</span>
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default EffectsModal;
