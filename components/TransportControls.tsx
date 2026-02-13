
import React from 'react';
import Button from './Button';
import { SelectionRange } from '../types';

// Icons
const UploadIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>;
const MicIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
const StopRecIcon = () => <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
const DrumIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14a2 2 0 012 2v1H3v-1a2 2 0 012-2zm0-6h14l1.5 5H3.5L5 14zm0-9a3 3 0 016 0v2H5V5zm8 0a3 3 0 016 0v2h-6V5z"/></svg>;
const PlayIcon = () => <svg className="w-8 h-8 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const ScissorsIcon = () => <svg className="w-5 h-5 -rotate-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>;
const IOSCropIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z" /></svg>;
const FxIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"/></svg>;
const LibraryIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;

interface TransportControlsProps {
    isPlaying: boolean;
    isRecording: boolean;
    selectedTrackId: string | null;
    isTrimMode: boolean;
    interactiveMode: any;
    selection: SelectionRange | null;
    hasTracks: boolean;
    recentProjectPreview: string | null;
    onPlayPause: () => void;
    onToggleRecord: () => void;
    onCut: () => void;
    onCrop: () => void;
    onEffects: () => void;
    onImportClick: () => void;
    onBeatClick: () => void;
    onLibraryClick: () => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
    isPlaying, isRecording, selectedTrackId, isTrimMode, interactiveMode, selection, hasTracks,
    recentProjectPreview,
    onPlayPause, onToggleRecord, onCut, onCrop, onEffects, onImportClick, onBeatClick, onLibraryClick
}) => {
    return (
        <footer className="bg-zinc-950 border-t border-zinc-900 p-4 pb-8 safe-area-pb space-y-4 shrink-0 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] flex flex-col w-full landscape:w-20 landscape:xl:w-full h-auto landscape:h-full landscape:xl:h-auto landscape:border-t-0 landscape:border-l landscape:xl:border-t landscape:xl:border-l-0 landscape:py-0 landscape:px-2 landscape:xl:p-4 landscape:xl:pb-8 landscape:justify-between landscape:xl:justify-normal landscape:overflow-visible no-scrollbar">
            
            {/* Mobile Portrait View */}
            <div className="flex flex-col gap-4 landscape:hidden landscape:xl:flex">
                <div className="flex items-center justify-between max-w-md mx-auto w-full px-4 landscape:xl:gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onImportClick} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition group">
                            <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition"><UploadIcon /></div>
                            <span className="text-[9px] uppercase font-bold tracking-wide">Import</span>
                        </button>
                        <button onClick={onLibraryClick} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition group">
                            <div className={`w-12 h-12 overflow-hidden bg-zinc-900 group-hover:ring-2 ring-cyan-500/50 transition border border-zinc-800 flex items-center justify-center ${recentProjectPreview ? 'rounded-md' : 'rounded-full p-3'}`}>
                                {recentProjectPreview ? (<img src={recentProjectPreview} alt="Library" className="w-full h-full object-cover opacity-80" />) : (<LibraryIcon />)}
                            </div>
                            <span className="text-[9px] uppercase font-bold tracking-wide">Library</span>
                        </button>
                    </div>
                    
                    <button onClick={onPlayPause} disabled={!hasTracks && !isRecording} className={`w-16 h-16 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20'} text-black flex items-center justify-center shadow-xl active:scale-95 transition disabled:opacity-50 disabled:grayscale`}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={onToggleRecord} className={`flex flex-col items-center gap-1 transition group ${isRecording ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-white'}`}>
                            <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition">{isRecording ? <StopRecIcon /> : <MicIcon />}</div>
                            <span className="text-[9px] uppercase font-bold tracking-wide">{isRecording ? "Stop" : "Mic"}</span>
                        </button>
                        <button onClick={onBeatClick} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition group">
                            <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition"><DrumIcon /></div>
                            <span className="text-[9px] uppercase font-bold tracking-wide">Beat</span>
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 max-w-md mx-auto w-full">
                    <Button variant="secondary" icon={<ScissorsIcon />} label="Cut" disabled={!selectedTrackId} onClick={onCut} className="h-12 text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800" />
                    <Button variant={isTrimMode ? "primary" : "secondary"} icon={isTrimMode ? null : <IOSCropIcon />} label={selection ? "Crop Selection" : (isTrimMode ? "Done" : "Crop Tool")} disabled={!selectedTrackId} onClick={onCrop} className={`h-12 text-xs ${isTrimMode ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-none' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`} />
                    <Button variant={interactiveMode ? "primary" : "secondary"} icon={interactiveMode ? null : <FxIcon />} label={interactiveMode ? "Done" : "Effects"} disabled={!selectedTrackId} onClick={onEffects} className={`h-12 text-xs ${interactiveMode ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-none' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`} />
                </div>
            </div>

            {/* Mobile Landscape View (Compact Sidebar) */}
            <div className="hidden landscape:flex landscape:xl:hidden flex-col h-full w-full py-2 safe-area-pb">
                
                {/* Top Buttons (Import, Record, Beat) - Evenly spaced */}
                <div className="flex-1 flex flex-col items-center justify-evenly min-h-0">
                    <button onClick={onImportClick} className="w-10 h-10 rounded-full bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition shadow-sm">
                        <UploadIcon />
                    </button>
                    <button onClick={onToggleRecord} className={`w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center transition shadow-sm ${isRecording ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                        {isRecording ? <StopRecIcon /> : <MicIcon />}
                    </button>
                    <button onClick={onBeatClick} className="w-10 h-10 rounded-full bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition shadow-sm">
                        <DrumIcon />
                    </button>
                </div>

                {/* Center Play Button - Fixed Center */}
                <div className="shrink-0 flex items-center justify-center py-2">
                    <button onClick={onPlayPause} disabled={!hasTracks && !isRecording} className={`w-14 h-14 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20'} text-black flex items-center justify-center shadow-xl active:scale-95 transition disabled:opacity-50 disabled:grayscale`}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                </div>

                {/* Bottom Buttons (Cut, Crop, Effects) - Evenly spaced */}
                <div className="flex-1 flex flex-col items-center justify-evenly min-h-0">
                     <button onClick={onCut} disabled={!selectedTrackId} className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm ${selectedTrackId ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-600'}`}>
                        <ScissorsIcon />
                     </button>
                     <button onClick={onCrop} disabled={!selectedTrackId} className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm ${isTrimMode ? 'bg-yellow-400 text-black hover:bg-yellow-300' : selectedTrackId ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-600'}`}>
                        <IOSCropIcon />
                     </button>
                     <button onClick={onEffects} disabled={!selectedTrackId} className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm ${interactiveMode ? 'bg-yellow-400 text-black hover:bg-yellow-300' : selectedTrackId ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-600'}`}>
                        <FxIcon />
                     </button>
                </div>
            </div>
        </footer>
    );
};
