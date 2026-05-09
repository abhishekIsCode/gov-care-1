import React, { useRef, useState } from 'react';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { Camera, RefreshCw, X, Sparkles, Scan, Zap } from 'lucide-react';
import { extractHealthIdFromImage } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface AIVisionScannerProps {
  onIdScanned: (id: string) => void;
  onClose: () => void;
}

export default function AIVisionScanner({ onIdScanned, onClose }: AIVisionScannerProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes && detectedCodes.length > 0 && !hasScanned) {
      setHasScanned(true);
      onIdScanned(detectedCodes[0].rawValue);
    }
  };

  const captureFrameAndAnalyze = async () => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (!video) return;

    setIsAiLoading(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      const result = await extractHealthIdFromImage(base64);
      
      if (!hasScanned) {
        if (result && result !== "NULL" && result !== "null") {
          setHasScanned(true);
          onIdScanned(result);
        } else {
          setError("AI could not extract ID from frame. Try holding the card steadier.");
        }
      }
    } catch (err) {
      console.error("Capture failure:", err);
      setError("Frame capture failed.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await extractHealthIdFromImage(base64);
        
        if (!hasScanned) {
          if (result && result !== "NULL" && result !== "null") {
            setHasScanned(true);
            onIdScanned(result);
          } else {
            setError("No ID found in photo.");
          }
        }
        setIsAiLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("File processing failed.");
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#f2f2ee] border-4 border-black brutalist-shadow w-full max-w-xl overflow-hidden flex flex-col relative"
      >
        <div className="p-8 border-b-4 border-black flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black text-white brutalist-shadow-sm">
              <Scan size={28} />
            </div>
            <div>
              <h2 className="font-serif italic font-bold text-3xl text-black leading-none">Vision Active.</h2>
              <p className="font-mono text-[9px] font-bold tracking-[0.3em] text-[#88887e] mt-1 uppercase">Node Connection: Live</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black hover:text-white border-2 border-black transition-all brutalist-shadow-sm bg-white active:translate-x-0.5 active:translate-y-0.5">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-10">
          <div className="relative group">
            <div className="overflow-hidden border-4 border-black brutalist-shadow-sm bg-black relative">
              <Scanner
                onScan={handleScan}
                onError={(e) => {
                  console.error("Scanner Error:", e);
                }}
                components={{
                  finder: false,
                }}
                styles={{
                  container: { width: '100%', aspectRatio: '1/1', objectFit: 'cover' },
                  video: { objectFit: 'cover' }
                }}
              />
            </div>
            
            {/* Viewfinder Overlays */}
            <div className="absolute inset-x-8 inset-y-8 pointer-events-none z-10">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#ff4d00]" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#ff4d00]" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#ff4d00]" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#ff4d00]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={captureFrameAndAnalyze}
              disabled={isAiLoading || hasScanned}
              className="flex items-center justify-center gap-3 py-5 bg-black text-white font-mono font-bold tracking-[0.2em] hover:bg-zinc-800 transition-all brutalist-shadow disabled:opacity-50 text-[10px] uppercase"
            >
              {isAiLoading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <>
                  <Zap size={18} className="text-[#ff4d00]" />
                  <span>Capture Frame</span>
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiLoading || hasScanned}
              className="flex items-center justify-center gap-3 py-5 bg-white border-2 border-black text-black font-mono font-bold tracking-[0.2em] hover:bg-[#f2f2ee] transition-all brutalist-shadow-sm disabled:opacity-50 text-[10px] uppercase"
            >
              <Sparkles size={18} />
              <span>Import File</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 bg-rose-50 text-rose-700 font-mono text-[9px] font-bold tracking-[0.3em] leading-relaxed uppercase border-2 border-rose-200 brutalist-shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <X size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-10 py-6 bg-[#dfdfd9] border-t-4 border-black flex justify-between items-center">
          <span className="font-mono text-[8px] text-[#88887e] font-bold tracking-[0.4em] uppercase italic">System Layer: 3.11.0</span>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
