import React from 'react';
import { Volume2, VolumeX, Shield, Play, Pause, RotateCcw, Clock, Laptop, Monitor } from 'lucide-react';
import { AppRound, UserRole } from '../types';
import { isSoundEnabled, toggleSound, playTickSound } from '../utils/audio';

interface HeaderProps {
  currentRound: AppRound;
  round2TimeLeft: number;
  isRound2TimerRunning: boolean;
  userRole?: UserRole;
  onToggleRound2Timer: () => void;
  onResetRound2Timer: () => void;
  onNavigateRound?: (round: AppRound) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRound,
  round2TimeLeft,
  isRound2TimerRunning,
  userRole = 'admin',
  onToggleRound2Timer,
  onResetRound2Timer,
}) => {
  const [soundOn, setSoundOn] = React.useState(isSoundEnabled());

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) {
      playTickSound();
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = round2TimeLeft <= 300; // Under 5 mins
  const isCriticalTime = round2TimeLeft <= 60; // Under 1 min

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Department & Event Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white font-black text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">CODE CLASH</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold tracking-wide">
                CSE CLUB
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Department of Computer Science & Engineering</p>
          </div>
        </div>

        {/* Center: 40-Minute Master Timer for Round 2 */}
        {(currentRound === 'round2_intro' || currentRound === 'round2_auction' || currentRound === 'final_podium') && (
          <div className="flex items-center gap-3 bg-slate-100/80 px-3.5 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isCriticalTime ? 'text-rose-600 animate-pulse' : isLowTime ? 'text-amber-600' : 'text-indigo-600'}`} />
              <div className="text-left">
                <div className="text-[10px] tracking-wider uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                  <span>Auction Timer</span>
                  {userRole === 'admin' ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Admin Control
                    </span>
                  ) : (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      isRound2TimerRunning ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isRound2TimerRunning ? 'Running' : 'Paused'}
                    </span>
                  )}
                </div>
                <div
                  className={`font-mono text-xl sm:text-2xl font-black tracking-wider leading-none ${
                    isCriticalTime
                      ? 'text-rose-600 animate-pulse'
                      : isLowTime
                      ? 'text-amber-600'
                      : 'text-slate-900'
                  }`}
                >
                  {formatTimer(round2TimeLeft)}
                </div>
              </div>
            </div>

            {/* ONLY ADMIN CAN ACCESS RELOAD AND PAUSE CONTROLS - TEAMS SHOW TIMING ONLY */}
            {userRole === 'admin' ? (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2.5">
                <button
                  id="btn-toggle-timer"
                  type="button"
                  onClick={onToggleRound2Timer}
                  title={isRound2TimerRunning ? 'Pause 40m Timer' : 'Start 40m Timer'}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  {isRound2TimerRunning ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  id="btn-reset-timer"
                  type="button"
                  onClick={onResetRound2Timer}
                  title="Reset 40m Timer"
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="border-l border-slate-200 pl-2.5 hidden sm:flex items-center">
                <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs">
                  <span className={`w-2 h-2 rounded-full ${isRound2TimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{isRound2TimerRunning ? 'Live Synced' : 'Paused by Admin'}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Right: Round Status & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Round Indicator Pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {currentRound === 'registration' && 'Registration Phase'}
            {currentRound === 'round1_mcq' && 'Round 1: DSA Quiz'}
            {currentRound === 'round1_result' && 'Round 1: Results'}
            {currentRound === 'round2_intro' && 'Round 2: Bid Auction Arena'}
            {currentRound === 'round2_auction' && (
              <span className="flex items-center gap-1">
                Round 2:
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  userRole === 'admin'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : userRole === 'team'
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                }`}>
                  {userRole === 'admin' ? 'Admin Mode' : userRole === 'team' ? 'Team Terminal' : 'Projector'}
                </span>
              </span>
            )}
            {currentRound === 'final_podium' && 'Victory Podium'}
          </div>

          {/* Sound Toggle */}
          <button
            id="btn-sound-toggle"
            onClick={handleSoundToggle}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
            title={soundOn ? 'Sound Effects Enabled' : 'Sound Effects Muted'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
