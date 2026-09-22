import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';
import { playRound2TransitionSound, stopAllAudio } from '../utils/audio';

interface RoundTransitionScreenProps {
  isOpen: boolean;
  onComplete: () => void;
  teamName?: string;
  roundNumber?: number;
  title?: string;
  subtitle?: string;
}

export const RoundTransitionScreen: React.FC<RoundTransitionScreenProps> = ({
  isOpen,
  onComplete,
  teamName,
  roundNumber = 2,
  title = 'ROUND 2 UNLOCKED',
  subtitle = 'THE 100-COIN BID AUCTION ARENA',
}) => {
  const stopAudioRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hasCompletedRef = useRef(false);

  const handleProceedNow = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    stopAllAudio();
    onCompleteRef.current();
  };

  useEffect(() => {
    if (isOpen) {
      hasCompletedRef.current = false;
      // Start transition sound with maximum 10-second cap
      stopAudioRef.current = playRound2TransitionSound(10);

      // Auto-advance after 1800ms
      const timer = setTimeout(() => {
        handleProceedNow();
      }, 1800);

      return () => {
        clearTimeout(timer);
        if (stopAudioRef.current) {
          stopAudioRef.current();
          stopAudioRef.current = null;
        }
        stopAllAudio();
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6 relative overflow-hidden"
          >
            {/* Ambient Background Accent */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Stage Progression
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">
                Round {roundNumber}
              </h2>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-indigo-600">
                {subtitle}
              </p>
            </div>

            {teamName && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono">
                <span className="text-[11px] text-slate-500 block uppercase font-sans font-bold">
                  Active Competitor Squad
                </span>
                <span className="text-lg font-black text-slate-900">{teamName}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                id="btn-proceed-round2-direct"
                type="button"
                onClick={handleProceedNow}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>CONTINUE TO ROUND 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                <span>Syncing terminal data & timer...</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
