import React from 'react';
import { Trophy, Award, Coins, TrendingUp, TrendingDown, X, Star, Radio, Shield, Lock } from 'lucide-react';
import { Team, AuctionQuestionResult, Round2Question, UserRole } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  questionResults: AuctionQuestionResult[];
  questions: Round2Question[];
  userRole?: UserRole;
  isBroadcasted?: boolean;
  onToggleBroadcast?: (broadcast: boolean) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  teams,
  questionResults,
  questions,
  userRole = 'team',
  isBroadcasted = false,
  onToggleBroadcast,
}) => {
  if (!isOpen) return null;

  // Sort teams by score descending, then by remaining coins
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.coins - a.coins;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-xl space-y-6 relative my-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {userRole === 'admin' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Admin Leaderboard Controller</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Broadcasted by Admin</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {userRole === 'admin' && onToggleBroadcast && (
              <button
                type="button"
                onClick={() => onToggleBroadcast(!isBroadcasted)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isBroadcasted
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                }`}
                title={isBroadcasted ? 'Click to hide from participant team screens' : 'Click to display on all participant team screens'}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{isBroadcasted ? 'Live on Team Screens' : 'Broadcast to Teams'}</span>
              </button>
            )}

            <button
              id="btn-close-leaderboard"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider border border-amber-200">
            <Trophy className="w-3.5 h-3.5 text-amber-600" /> Live Standings
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Round 2 Leaderboard</h2>
          <p className="text-xs text-slate-500">
            100 Initial Coins • +10 Pts for Correct • -10 Pts for Wrong
          </p>
        </div>

        {/* Podium for Top 3 */}
        <div className="grid grid-cols-3 gap-3 pt-2 items-end max-w-md mx-auto">
          {/* 2nd Place */}
          {sortedTeams[1] && (
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">{sortedTeams[1].avatar}</span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-full text-center">
                {sortedTeams[1].name}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {sortedTeams[1].score} pts
              </span>
              <div className="w-full h-20 bg-slate-100 border border-slate-200 rounded-t-xl flex flex-col items-center justify-center mt-2 shadow-2xs">
                <span className="text-base font-extrabold text-slate-700">2nd</span>
                <span className="text-[10px] text-amber-700 font-mono flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5 text-amber-500" /> {sortedTeams[1].coins}
                </span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {sortedTeams[0] && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <Star className="w-5 h-5 text-amber-500 absolute -top-4 -right-1 animate-bounce" />
                <span className="text-3xl mb-1">{sortedTeams[0].avatar}</span>
              </div>
              <span className="text-xs font-extrabold text-slate-900 truncate max-w-full text-center">
                {sortedTeams[0].name}
              </span>
              <span className="text-sm font-mono font-black text-amber-700">
                {sortedTeams[0].score} pts
              </span>
              <div className="w-full h-28 bg-amber-50 border border-amber-300 rounded-t-xl flex flex-col items-center justify-center mt-2 shadow-xs">
                <Trophy className="w-6 h-6 text-amber-500 mb-1" />
                <span className="text-lg font-black text-amber-800">1st</span>
                <span className="text-[11px] text-amber-800 font-mono font-bold flex items-center gap-0.5">
                  <Coins className="w-3 h-3 text-amber-500" /> {sortedTeams[0].coins} coins
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {sortedTeams[2] && (
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">{sortedTeams[2].avatar}</span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-full text-center">
                {sortedTeams[2].name}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {sortedTeams[2].score} pts
              </span>
              <div className="w-full h-16 bg-slate-100/70 border border-slate-200 rounded-t-xl flex flex-col items-center justify-center mt-2 shadow-2xs">
                <span className="text-sm font-extrabold text-slate-600">3rd</span>
                <span className="text-[10px] text-amber-700 font-mono flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5 text-amber-500" /> {sortedTeams[2].coins}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Team</div>
            <div className="col-span-2 text-center">Coins</div>
            <div className="col-span-2 text-center">W/L</div>
            <div className="col-span-2 text-right">Points</div>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-medium">
            {sortedTeams.map((team, idx) => (
              <div
                key={team.id}
                className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="col-span-1 font-bold text-slate-400">{idx + 1}</div>
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-base">{team.avatar}</span>
                  <div>
                    <span className="text-slate-900 font-bold block">{team.name}</span>
                    <span className="text-[10px] text-slate-500">{team.bidsWon} bids won</span>
                  </div>
                </div>
                <div className="col-span-2 text-center font-mono font-bold text-amber-700 flex items-center justify-center gap-1">
                  <Coins className="w-3 h-3 text-amber-500" /> {team.coins}
                </div>
                <div className="col-span-2 text-center font-mono text-[11px]">
                  <span className="text-emerald-700 font-bold">{team.correctCount}</span>
                  <span className="text-slate-400"> / </span>
                  <span className="text-rose-700 font-bold">{team.wrongCount}</span>
                </div>
                <div className="col-span-2 text-right font-mono font-black text-sm">
                  <span
                    className={
                      team.score > 0
                        ? 'text-emerald-700'
                        : team.score < 0
                        ? 'text-rose-700'
                        : 'text-slate-700'
                    }
                  >
                    {team.score > 0 ? `+${team.score}` : team.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question History */}
        {questionResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completed Questions History
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {questionResults.map((res, i) => {
                const team = teams.find((t) => t.id === res.winningTeamId);
                const q = questions.find((item) => item.id === res.questionId);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <span className="text-slate-800 font-medium truncate max-w-[200px]">
                      Q{res.questionId}: {q?.title}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600">{team?.name}</span>
                      <span className="text-amber-700 font-mono text-[11px]">
                        -{res.winningBid} coins
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          res.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {res.pointsDelta > 0 ? `+${res.pointsDelta}` : res.pointsDelta} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
