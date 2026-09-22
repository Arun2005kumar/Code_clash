import React, { useEffect } from 'react';
import { Trophy, Award, Coins, Star, RotateCcw, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Team, AuctionQuestionResult } from '../types';
import { playCorrectSound } from '../utils/audio';

interface FinalPodiumProps {
  teams: Team[];
  onRestart: () => void;
  onBackToAuction: () => void;
}

export const FinalPodium: React.FC<FinalPodiumProps> = ({
  teams,
  onRestart,
  onBackToAuction,
}) => {
  useEffect(() => {
    playCorrectSound();
  }, []);

  const sortedTeams = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.coins - a.coins;
  });

  const champion = sortedTeams[0];
  const runnerUp = sortedTeams[1];
  const secondRunnerUp = sortedTeams[2];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Champion Announcement Hero */}
      <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200 shadow-xs text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest border border-indigo-100 mb-4">
          <Trophy className="w-4 h-4 text-indigo-600" /> CODE CLASH 2026 CHAMPIONS
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 mb-2 tracking-tight">
          Department of CSE Victory Podium
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto mb-8">
          The 10-Question Bid Auction has concluded! Congratulations to all teams for participating in this clash of brains and bidding tactics.
        </p>

        {/* 3-Tier Podium */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-xl mx-auto mb-10 pt-4">
          {/* 2nd Place */}
          {runnerUp && (
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl mb-1">{runnerUp.avatar}</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate max-w-full">
                {runnerUp.name}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 mb-2">
                {runnerUp.score} pts
              </span>
              <div className="w-full h-28 sm:h-36 bg-slate-50 border border-slate-200 rounded-t-2xl flex flex-col items-center justify-center p-3 shadow-2xs">
                <span className="text-xl sm:text-2xl font-black text-slate-700">2nd</span>
                <span className="text-[11px] text-amber-700 font-mono font-bold flex items-center gap-1 mt-1">
                  <Coins className="w-3 h-3 text-amber-600" /> {runnerUp.coins}c left
                </span>
                <span className="text-[10px] text-emerald-700 mt-1 font-semibold">
                  {runnerUp.correctCount} won
                </span>
              </div>
            </div>
          )}

          {/* 1st Place Champion */}
          {champion && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <Star className="w-6 h-6 text-amber-500 absolute -top-5 -right-2 animate-bounce" />
                <span className="text-5xl sm:text-6xl mb-2">{champion.avatar}</span>
              </div>
              <span className="text-sm sm:text-base font-black text-indigo-700 truncate max-w-full">
                {champion.name}
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-slate-900 mb-2">
                {champion.score} Points
              </span>
              <div className="w-full h-36 sm:h-48 bg-indigo-50 border border-indigo-200 rounded-t-2xl flex flex-col items-center justify-center p-3 shadow-xs">
                <Trophy className="w-8 h-8 text-amber-500 mb-1" />
                <span className="text-2xl sm:text-3xl font-black text-indigo-900">1st</span>
                <span className="text-xs text-amber-800 font-mono font-bold flex items-center gap-1 mt-1">
                  <Coins className="w-3.5 h-3.5 text-amber-600" /> {champion.coins} Coins
                </span>
                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider mt-1">
                  Grand Winner
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {secondRunnerUp && (
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl mb-1">{secondRunnerUp.avatar}</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate max-w-full">
                {secondRunnerUp.name}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 mb-2">
                {secondRunnerUp.score} pts
              </span>
              <div className="w-full h-24 sm:h-28 bg-slate-50 border border-slate-200 rounded-t-2xl flex flex-col items-center justify-center p-3 shadow-2xs">
                <span className="text-lg sm:text-xl font-black text-slate-600">3rd</span>
                <span className="text-[11px] text-amber-700 font-mono font-bold flex items-center gap-1 mt-1">
                  <Coins className="w-3 h-3 text-amber-600" /> {secondRunnerUp.coins}c left
                </span>
                <span className="text-[10px] text-emerald-700 mt-1 font-semibold">
                  {secondRunnerUp.correctCount} won
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            id="btn-back-to-auction"
            onClick={onBackToAuction}
            className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Review Auction Questions
          </button>
          <button
            id="btn-restart-event"
            onClick={onRestart}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Start New Event Run
          </button>
        </div>
      </div>

      {/* Comprehensive Standings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          Final Event Standings & Stats
        </h3>

        <div className="divide-y divide-slate-100">
          {sortedTeams.map((team, idx) => (
            <div
              key={team.id}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono font-bold text-slate-500 text-sm">
                  #{idx + 1}
                </span>
                <span className="text-2xl">{team.avatar}</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{team.name}</h4>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                    <span className="text-emerald-700 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {team.correctCount} correct
                    </span>
                    <span>•</span>
                    <span className="text-rose-700 flex items-center gap-0.5">
                      <XCircle className="w-3 h-3 text-rose-600" /> {team.wrongCount} wrong
                    </span>
                    <span>•</span>
                    <span>{team.bidsWon} bids won</span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div
                  className={`text-lg font-black ${
                    team.score > 0
                      ? 'text-emerald-700'
                      : team.score < 0
                      ? 'text-rose-700'
                      : 'text-slate-700'
                  }`}
                >
                  {team.score > 0 ? `+${team.score}` : team.score} pts
                </div>
                <div className="text-[11px] text-amber-700 font-bold flex items-center justify-end gap-1">
                  <Coins className="w-3 h-3 text-amber-600" /> {team.coins} coins left
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
