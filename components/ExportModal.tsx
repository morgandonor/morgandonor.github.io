
import React, { useState } from 'react';
import Button from './Button';
import { ExportFormat } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (sampleRate: number, format: ExportFormat) => void;
  originalSampleRate: number;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, originalSampleRate }) => {
  // Initialize state from localStorage or default to 'mp3'
  const [format, setFormat] = useState<ExportFormat>(() => {
      const saved = localStorage.getItem('export_format_preference');
      if (saved === 'wav' || saved === 'mp3' || saved === 'flac') {
          return saved as ExportFormat;
      }
      return 'mp3';
  });

  const handleFormatChange = (fmt: ExportFormat) => {
      setFormat(fmt);
      localStorage.setItem('export_format_preference', fmt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6">
        <div>
            <h2 className="text-xl font-bold text-white">Export Settings</h2>
            <p className="text-zinc-400 text-sm">Choose the format and quality.</p>
        </div>

        {/* Format Toggle - Order: MP3 | FLAC | WAV */}
        <div className="bg-zinc-950 p-1 rounded-xl flex border border-zinc-800">
            <button 
                onClick={() => handleFormatChange('mp3')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${format === 'mp3' ? 'bg-zinc-800 text-cyan-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                MP3
            </button>
            <button 
                onClick={() => handleFormatChange('flac')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${format === 'flac' ? 'bg-zinc-800 text-cyan-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                FLAC
            </button>
            <button 
                onClick={() => handleFormatChange('wav')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${format === 'wav' ? 'bg-zinc-800 text-cyan-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                WAV
            </button>
        </div>
        
        <div className="space-y-2">
            <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => { onExport(originalSampleRate, format); onClose(); }}
                className="justify-between group"
            >
                <span>Original Quality</span>
                <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded group-hover:text-white transition-colors">{originalSampleRate}Hz</span>
            </Button>
            
            <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => { onExport(44100, format); onClose(); }}
                className="justify-between group"
            >
                <span>CD Quality</span>
                <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded group-hover:text-white transition-colors">44.1kHz</span>
            </Button>

            <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => { onExport(22050, format); onClose(); }}
                className="justify-between group"
            >
                <span>Lo-Fi / Radio</span>
                <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded group-hover:text-white transition-colors">22kHz</span>
            </Button>
        </div>

        <div className="pt-2">
            <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
