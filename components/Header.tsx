
import React from 'react';
import Button from './Button';
import { MAX_ZOOM, MIN_ZOOM } from '../constants';

// Icons
const ZoomInIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const UndoIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>;
const ShareExportIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const LibraryIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const SaveStatusIcon = ({ status }: { status: 'saved' | 'saving' | 'unsaved' }) => {
    if (status === 'saving') return <span className="text-xs text-yellow-500 animate-pulse font-medium">Saving...</span>;
    if (status === 'saved') return <span className="text-xs text-green-500 font-medium">Saved</span>;
    return <span className="text-xs text-zinc-500 font-medium">Unsaved</span>;
};

// Custom Brand Icon Component
const BrandIcon = ({ className }: { className?: string }) => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" className={className} style={{ enableBackground: 'new 0 0 1024 1024' }} xmlSpace="preserve">
        <g>
            <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="253.7526" y1="1101.0885" x2="1005.372" y2="94.7881" gradientTransform="matrix(1 0 0 -1 0 1024)">
                <stop offset="0" style={{ stopColor: '#1FCBE7' }} />
                <stop offset="0.5" style={{ stopColor: '#7881EF' }} />
                <stop offset="1" style={{ stopColor: '#CC5DDC' }} />
            </linearGradient>
            <path fill="url(#SVGID_1_)" d="M253.3,499.5c16.3,0,30,11.7,32.5,27.8l12.8,81.1V255.8c0-6.7,5.3-12.2,12-12.5c6.7-0.3,12.4,4.8,13,11.5 l28.5,345.5l27.3-299.1c0.6-6.4,5.9-11.3,12.4-11.4c6.4,0,11.8,4.8,12.5,11.2l28.7,281.4l27.1-235c0.7-6.3,6-11,12.3-11.1 c6.3-0.1,11.7,4.6,12.5,10.8l29,217.5l27-171.2c0.9-6,6.1-10.5,12.1-10.6c6.1-0.1,11.3,4.2,12.5,10.1L595,546.9l26.7-107.8 c1.3-5.4,6-9.2,11.6-9.5c5.5-0.2,10.6,3.2,12.4,8.4l31.4,90.6l26.7-46.2c1.7-2.9,4.4-5,7.6-5.8c3.2-0.9,6.6-0.4,9.5,1.2l28.8,16.6 c5.6,3.3,12.1,5,18.6,5h128.7V39.9c-4.7-2.8-9.4-5.4-14.3-7.9C858.7,19.9,834.3,12.2,808,7.5c-25.8-4.6-52.2-6.2-78.3-6.9 c-12-0.3-24-0.5-36-0.5C679.5,0,665.2,0,651,0H373c-14.2,0-28.5,0-42.7,0.1c-12,0.1-24,0.2-36,0.5c-26.1,0.7-52.5,2.2-78.3,6.9 c-26.2,4.7-50.6,12.4-74.4,24.5c-4.3,2.2-8.6,4.5-12.7,7v460.5H253.3z" />
            
            <linearGradient id="SVGID_2_" gradientUnits="userSpaceOnUse" x1="21.2045" y1="927.3951" x2="772.824" y2="-78.9052" gradientTransform="matrix(1 0 0 -1 0 1024)">
                <stop offset="0" style={{ stopColor: '#1FCBE7' }} />
                <stop offset="0.5" style={{ stopColor: '#7881EF' }} />
                <stop offset="1" style={{ stopColor: '#CC5DDC' }} />
            </linearGradient>
            <path fill="url(#SVGID_2_)" d="M768.1,524.5c-10.9,0-21.6-2.9-31.1-8.3 l-18-10.4l-34.1,59c-2.4,4.2-7.1,6.7-12,6.2c-4.9-0.5-9-3.7-10.6-8.4l-26.5-76.6l-30.2,122.1c-1.4,5.6-6.4,9.5-12.1,9.5 c-0.1,0-0.2,0-0.3,0c-5.9-0.2-10.8-4.4-11.9-10.1l-26.8-139.4l-29.2,185.6c-1,6.1-6.2,10.6-12.3,10.6c-0.1,0-0.1,0-0.2,0 c-6.2-0.1-11.4-4.7-12.2-10.8l-27.1-203.1l-28.8,249.4c-0.7,6.3-6.1,11.1-12.4,11.1c0,0-0.1,0-0.1,0c-6.4,0-11.7-4.9-12.4-11.2 l-27.2-267L363.9,746c-0.6,6.4-6,11.4-12.4,11.4c0,0,0,0-0.1,0c-6.5,0-11.9-5-12.4-11.5l-15.4-186.4v208.7c0,6.5-5,12-11.5,12.5 c-0.3,0-0.7,0-1,0c-6.1,0-11.4-4.4-12.3-10.6l-37.6-238.9c-0.6-3.9-3.9-6.7-7.8-6.7H128.8V985c4.2,2.4,8.4,4.8,12.7,7 c23.8,12.1,48.2,19.8,74.4,24.5c25.8,4.6,52.2,6.2,78.3,6.9c12,0.3,24,0.5,36,0.5c14.2,0.1,28.5,0.1,42.7,0.1h278 c14.2,0,28.5,0,42.7-0.1c12-0.1,24-0.2,36-0.5c26.1-0.7,52.5-2.2,78.3,6.9c26.2-4.7,50.6-12.4,74.4-24.5c4.9-2.5,9.6-5.1,14.3-7.9 V524.5H768.1z" />
            
            <path fill="#FFFFFF" d="M749.5,494.5l-28.8-16.6c-2.9-1.7-6.3-2.1-9.5-1.2c-3.2,0.9-5.9,3-7.6,5.8L677,528.6L645.6,438 c-1.8-5.2-6.8-8.6-12.4-8.4c-5.5,0.3-10.2,4.1-11.6,9.5L595,546.9l-29.6-153.7c-1.1-6-6.4-10.3-12.5-10.1 c-6.1,0.1-11.2,4.6-12.1,10.6l-27,171.2l-29-217.5c-0.8-6.3-6.2-10.9-12.5-10.8c-6.3,0.1-11.6,4.8-12.3,11.1l-27.1,235l-28.7-281.4 c-0.7-6.4-6.1-11.3-12.5-11.2c-6.4,0-11.8,5-12.4,11.4l-27.3,299.1l-28.5-345.5c-0.6-6.7-6.3-11.8-13-11.5c-6.7,0.3-12,5.8-12,12.5 v352.6l-12.8-81.1c-2.5-16.1-16.2-27.8-32.5-27.8H128.8v25h124.6c3.9,0,7.2,2.8,7.8,6.7l37.6,238.9c1,6.1,6.2,10.6,12.3,10.6 c0.3,0,0.7,0,1,0c6.5-0.5,11.5-5.9,11.5-12.5V559.5L339,745.9c0.5,6.5,5.9,11.4,12.4,11.5c0,0,0,0,0.1,0c6.5,0,11.9-4.9,12.4-11.4 l28.6-313.5l27.2,267c0.6,6.3,6,11.2,12.4,11.2c0,0,0.1,0,0.1,0c6.3,0,11.7-4.8,12.4-11.1l28.8-249.4l27.1,203.1 c0.8,6.2,6,10.8,12.2,10.8c0.1,0,0.1,0,0.2,0c6.1,0,11.4-4.5,12.3-10.6l29.2-185.6l26.8,139.4c1.1,5.8,6.1,10,11.9,10.1 c0.1,0,0.2,0,0.3,0c5.7,0,10.7-3.9,12.1-9.5l30.2-122.1l26.5,76.6c1.6,4.6,5.8,7.9,10.6,8.4c4.9,0.5,9.6-2,12-6.2l34.1-59l18,10.4 c9.4,5.4,20.2,8.3,31.1,8.3h128.7v-25H768.1C761.6,499.5,755.2,497.8,749.5,494.5z" />
            
            <path fill="#FACC14" d="M78.1,78.1C59.5,96.7,44,118.1,32,141.5C19.9,165.3,12.2,189.7,7.5,216c-4.6,25.8-6.2,52.2-6.9,78.3 c-0.3,12-0.5,24-0.5,36C0,344.5,0,358.8,0,373v278c0,14.2,0,28.5,0.1,42.7c0.1,12,0.2,24,0.5,36c0.7,26.1,2.2,52.5,6.9,78.3 c4.7,26.2,12.4,50.6,24.5,74.4c11.9,23.4,27.5,44.8,46.1,63.4c15.2,15.2,32.2,28.3,50.7,39.1V524.5v-25V39 C110.3,49.8,93.3,62.9,78.1,78.1z M108.1,630.8c3.5,6.9,0.6,15.3-6.3,18.8c-2,1-4.1,1.5-6.2,1.5c-5.1,0-10.1-2.8-12.5-7.8 l-62.3-125c-2-3.9-2-8.6,0-12.5l62.3-125c3.5-6.9,11.9-9.7,18.8-6.3c6.9,3.5,9.7,11.9,6.3,18.8L48.9,512L108.1,630.8z" />
            
            <path fill="#FACC14" d="M1023.9,330.3c-0.1-12-0.2-24-0.5-36c-0.7-26.1-2.2-52.5-6.9-78.3c-4.7-26.2-12.4-50.6-24.5-74.4 c-11.9-23.4-27.5-44.8-46.1-63.4c-14.7-14.7-31.2-27.5-49.1-38.2v459.6v25v459.6c17.9-10.6,34.4-23.5,49.1-38.2 c18.6-18.6,34.1-40,46.1-63.4c12.1-23.8,19.8-48.2,24.5-74.4c4.6-25.8,6.2-52.2,6.9-78.3c0.3-12,0.5-24,0.5-36 c0.1-14.2,0.1-28.5,0.1-42.7V373C1024,358.8,1024,344.5,1023.9,330.3z M1004.1,518.2l-62.3,125c-2.4,4.9-7.4,7.8-12.5,7.8 c-2.1,0-4.2-0.5-6.2-1.5c-6.9-3.5-9.7-11.9-6.3-18.8L975.9,512l-59.2-118.8c-3.5-6.9-0.6-15.3,6.3-18.8c6.9-3.5,15.3-0.6,18.8,6.3 l62.3,125C1006,509.7,1006,514.3,1004.1,518.2z" />
            
            <path d="M101.8,374.5c-6.9-3.5-15.3-0.6-18.8,6.3l-62.3,125c-2,3.9-2,8.6,0,12.5l62.3,125c2.5,4.9,7.4,7.8,12.5,7.8 c2.1,0,4.2-0.5,6.2-1.5c6.9-3.5,9.7-11.9,6.3-18.8L48.9,512l59.2-118.8C111.5,386.3,108.7,377.9,101.8,374.5z" />
            <path d="M941.8,380.8c-3.5-6.9-11.9-9.7-18.8-6.3c-6.9,3.5-9.7,11.9-6.3-18.8L975.9,512l-59.2,118.8c-3.5-6.9-0.6,15.3,6.3-18.8 c2,1,4.1,1.5,6.2,1.5c5.1,0,10.1-2.8,12.5-7.8l62.3-125c2-3.9,2-8.6,0-12.5L941.8,380.8z" />
            <polygon points="1024,0 1024,373 1024,651 1024,1024 1024,1024 1024,0" />
        </g>
    </svg>
);

interface HeaderProps {
    currentProjectName: string;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    hasProjectId: boolean;
    historyLength: number;
    tracksCount: number;
    zoom: number;
    currentTime: number;
    maxDuration: number;
    recentProjectPreview: string | null;
    onZoom: (val: number) => void;
    onUndo: () => void;
    onExport: () => void;
    onSaveAndClose: () => void;
    minZoom?: number;
}

const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(2);
    return `${m}m ${s}s`;
};

export const Header: React.FC<HeaderProps> = ({
    currentProjectName, saveStatus, hasProjectId, historyLength, tracksCount,
    zoom, currentTime, maxDuration, recentProjectPreview,
    onZoom, onUndo, onExport, onSaveAndClose, minZoom = MIN_ZOOM
}) => {
    return (
        <>
            <header className="flex flex-col w-full landscape:w-16 landscape:xl:w-full h-auto landscape:h-full landscape:xl:h-auto border-b landscape:border-b-0 landscape:border-r landscape:xl:border-b landscape:xl:border-r-0 border-zinc-900 bg-zinc-950 shrink-0 z-20 justify-between items-center py-2 landscape:py-4 landscape:px-2 landscape:xl:p-4 landscape:xl:pb-8 landscape:justify-between landscape:xl:justify-normal landscape:overflow-visible no-scrollbar">
                <div className="flex items-center gap-3 w-full px-4 landscape:flex-col landscape:gap-4 landscape:px-0 landscape:xl:flex-row landscape:xl:px-4 landscape:xl:w-full landscape:xl:justify-start">
                    <div className="w-10 h-10 shrink-0 landscape:hidden landscape:xl:block">
                        <BrandIcon className="w-full h-full drop-shadow-2xl" />
                    </div>
                    <div className="hidden landscape:flex landscape:xl:hidden flex-col items-center">
                         <button onClick={onSaveAndClose} className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 flex items-center justify-center bg-zinc-900">
                            {recentProjectPreview ? <img src={recentProjectPreview} className="w-full h-full object-cover opacity-80" alt="Preview"/> : <LibraryIcon />}
                         </button>
                         <span className="text-[8px] text-zinc-500 mt-1 font-bold">LIB</span>
                    </div>
                    <div className="landscape:hidden landscape:xl:block flex-1 min-w-0">
                        <h1 className="text-lg font-bold tracking-tight text-white leading-tight truncate">SonicPocket</h1>
                        <div className="flex items-center gap-2"><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold truncate max-w-[150px]">{currentProjectName || "New Project"}</p>{hasProjectId && <SaveStatusIcon status={saveStatus} />}</div>
                    </div>
                    <div className="flex gap-2 items-center ml-auto landscape:hidden landscape:xl:flex">
                        <Button variant="ghost" onClick={onUndo} disabled={historyLength === 0} icon={<UndoIcon />} />
                        <Button variant="ghost" onClick={onExport} disabled={tracksCount === 0} className="text-cyan-400 hover:bg-cyan-950/30" icon={<ShareExportIcon />} />
                        <Button variant="ghost" onClick={onSaveAndClose} className="text-sm font-semibold text-zinc-300 hover:text-white" label="Done" />
                    </div>
                </div>
                
                {/* Mobile/Tablet Landscape Zoom Controls (Sidebar) */}
                <div className="hidden landscape:flex landscape:xl:hidden flex-col items-center gap-2 flex-1 justify-center py-2">
                     <button onClick={() => onZoom(zoom + 10)} className="p-1 hover:text-white text-zinc-500 shrink-0"><ZoomInIcon/></button>
                     <div className="relative w-6 h-24 lg:h-64 flex items-center justify-center group">
                         <input type="range" step={0.01} min={minZoom} max={MAX_ZOOM} value={zoom} onChange={(e) => onZoom(Number(e.target.value))} className="absolute w-24 lg:w-64 h-6 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 bg-zinc-800 rounded-full" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                     </div>
                     <button onClick={() => onZoom(zoom - 10)} className="p-1 hover:text-white text-zinc-500 shrink-0"><ZoomOutIcon/></button>
                </div>

                <div className="hidden landscape:flex landscape:xl:hidden flex-col gap-2 items-center pb-4">
                     <Button variant="ghost" onClick={onUndo} disabled={historyLength === 0} icon={<UndoIcon />} className="p-2" />
                     <Button variant="ghost" onClick={onExport} disabled={tracksCount === 0} className="text-cyan-400 hover:bg-cyan-950/30 p-2" icon={<ShareExportIcon />} />
                     <Button variant="ghost" onClick={onSaveAndClose} className="text-[10px] font-bold text-zinc-300 hover:text-white writing-vertical-lr py-2" label="DONE" />
                </div>
            </header>

            {/* Toolbar (Desktop / Mobile Portrait) */}
            <div className="landscape:hidden landscape:xl:flex h-12 flex items-center px-4 justify-between border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm shrink-0 gap-4">
                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 shrink-0">
                    <span className="uppercase">Tracks: {tracksCount}</span>
                    <span className="tabular-nums normal-case">
                        <span className="text-cyan-500">{formatTime(currentTime)}</span>
                        <span className="text-zinc-600 mx-2">/</span>
                        <span>{formatTime(maxDuration)}</span>
                    </span>
                </div>
                {/* Widen width for Mobile Portrait to align left button with undo */}
                <div className="flex items-center gap-2 w-44 md:w-64 md:flex-1 md:max-w-xs justify-end">
                    <button onClick={() => onZoom(zoom - 10)} className="p-2 hover:text-white text-zinc-500 shrink-0"><ZoomOutIcon/></button>
                    <div className="relative w-full h-6 flex items-center group"><input type="range" step={0.01} min={minZoom} max={MAX_ZOOM} value={zoom} onChange={(e) => onZoom(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500" /></div>
                    <button onClick={() => onZoom(zoom + 10)} className="p-2 hover:text-white text-zinc-500 shrink-0"><ZoomInIcon/></button>
                </div>
            </div>
        </>
    );
};
