import React, { useState } from 'react';
import { Coins, Trophy, Clock, ArrowRight, ShieldAlert, Sparkles, Code2, Film, Smile, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Team, ParticipantInfo } from '../types';
import { playGavelSound, playTickSound } from '../utils/audio';

interface Round2IntroProps {
  teams: Team[];
  participant: ParticipantInfo;
  onUpdateTeams: (teams: Team[]) => void;
  onStartAuction: () => void;
  onUpdateParticipant?: (info: ParticipantInfo) => void;
}

export const Round2Intro: React.FC<Round2IntroProps> = ({
  teams,
  participant,
  onUpdateTeams,
  onStartAuction,
  onUpdateParticipant,
}) => {
  // If participant already entered a valid team name (e.g. from Round 1 or stored session), share it.
  // Otherwise, start strictly empty so the user must manually enter it.
  const [myTeamName, setMyTeamName] = useState<string>(participant.teamName ? participant.teamName.trim() : '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [editableTeams, setEditableTeams] = useState<Team[]>(() => {
    return teams.map((t, idx) => {
      if (idx === 0) {
        return {
          ...t,
          name: participant.teamName ? participant.teamName.trim() : '',
        };
      }
      return t;
    });
  });

  const [newTeamName, setNewTeamName] = useState('');

  React.useEffect(() => {
    if (participant.teamName && participant.teamName.trim()) {
      const clean = participant.teamName.trim();
      setMyTeamName(clean);
      setEditableTeams((prev) =>
        prev.map((t, idx) => (idx === 0 ? { ...t, name: clean } : t))
      );
    }
  }, [participant.teamName]);

  const handleStart = () => {
    const cleanTeamName = myTeamName.trim().replace(/\s+/g, ' ');
    if (!cleanTeamName) {
      setValidationError('Please enter your team name to continue.');
      return;
    }

    setValidationError(null);
    playGavelSound();

    // Ensure Team 0 gets this team name
    const updated = editableTeams.map((t, idx) =>
      idx === 0 ? { ...t, name: cleanTeamName } : t
    );

    if (onUpdateParticipant) {
      onUpdateParticipant({
        ...participant,
        teamName: cleanTeamName,
      });
    }

    onUpdateTeams(updated);
    onStartAuction();
  };

  const handleUpdateName = (id: string, name: string) => {
    setEditableTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name } : t))
    );
  };

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const colors = ['from-rose-500 to-red-600', 'from-indigo-500 to-blue-600', 'from-emerald-500 to-teal-600'];
    const avatars = ['🤖', '⚡', '🔥', '🛡️', '🎯'];
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      coins: 100, // strictly 100 coins
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      bidsWon: 0,
    };
    setEditableTeams((prev) => [...prev, newTeam]);
    setNewTeamName('');
    playTickSound();
  };

  const handleRemoveTeam = (id: string) => {
    if (editableTeams.length <= 2) {
      alert('Need at least 2 teams for the auction!');
      return;
    }
    setEditableTeams((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Intro Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-100 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-600" /> Round 2 Official Briefing
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 mb-3 tracking-tight">
          THE BID AUCTION CLASH
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mb-8">
          Welcome to the grand showdown of <span className="text-indigo-600 font-bold">CODE CLASH</span>!
          Coins, strategy, algorithmic prowess, and creative engineering riddles await.
        </p>

        {/* 4 Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left mb-8">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <Coins className="w-6 h-6 text-amber-500 mb-2" />
            <h4 className="text-sm font-bold text-slate-900 mb-1">100 Coins / Team</h4>
            <p className="text-xs text-slate-500">
              Every team starts with a 100-coin bankroll to place strategic bids.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <Clock className="w-6 h-6 text-indigo-600 mb-2" />
            <h4 className="text-sm font-bold text-slate-900 mb-1">40-Minute Clock</h4>
            <p className="text-xs text-slate-500">
              Live master timer on screen for the entire 10-question auction battle.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <Code2 className="w-6 h-6 text-emerald-600 mb-2" />
            <h4 className="text-sm font-bold text-slate-900 mb-1">5 Code Questions</h4>
            <p className="text-xs text-slate-500">
              Tricky output predictions, bug hunting & safe algorithm verification.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <Film className="w-6 h-6 text-purple-600 mb-2" />
            <h4 className="text-sm font-bold text-slate-900 mb-1">5 Creative Puzzles</h4>
            <p className="text-xs text-slate-500">
              Cinematic noir/cyberpunk scenes & CSE emoji decoders!
            </p>
          </div>
        </div>

        {/* Mandatory Team Name Entry for Round 2 */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left max-w-xl mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ROUND 2 • YOUR TEAM NAME <span className="text-indigo-600">*</span>
            </label>
            {participant.teamName && (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Shared from Round 1
              </span>
            )}
          </div>
          <input
            id="input-round2-team-name"
            type="text"
            placeholder="Enter Team Name"
            value={myTeamName}
            onChange={(e) => {
              setMyTeamName(e.target.value);
              if (validationError) setValidationError(null);
              // Also sync to Team 0 in editableTeams
              setEditableTeams((prev) =>
                prev.map((t, idx) => (idx === 0 ? { ...t, name: e.target.value } : t))
              );
            }}
            className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 transition-all"
          />
          {validationError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          <span className="text-[11px] text-slate-400 block">
            Team name must be manually entered before entering the arena.
          </span>
        </div>

        {/* Scoring & Bidding Rule Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-2xl mx-auto mb-8 font-mono text-xs sm:text-sm text-center space-y-1.5">
          <span className="text-slate-500 block text-[11px] font-sans uppercase font-bold tracking-wider">
            Official Scoring & Coin Mechanism
          </span>
          <div>
            <span className="text-emerald-700 font-black">+10 POINTS</span> (Correct Answer) &nbsp;•&nbsp;{' '}
            <span className="text-slate-700 font-bold">Coins remain 100 for bidding</span>
          </div>
          <div>
            <span className="text-rose-700 font-black">-10 POINTS</span> (Wrong Answer) &nbsp;•&nbsp;{' '}
            <span className="text-rose-700 font-bold">Lose coins equal to your bid</span>
          </div>
          <div className="text-[11px] text-slate-600 font-sans pt-1 border-t border-slate-200">
            <strong>Admin Master Console:</strong> Only Admin controls Hammer Down & Grading (+10/-10) with automatic multi-system live sync to all team terminals!
          </div>
        </div>

        {/* Start Button */}
        <div>
          <button
            id="btn-launch-auction-arena"
            onClick={handleStart}
            className="px-8 sm:px-12 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-base shadow-xs flex items-center justify-center gap-3 mx-auto transition-all cursor-pointer"
          >
            <span>ENTER THE AUCTION ARENA</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Team Management Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Configure Competing Teams (100 Coins Each)
            </h3>
            <p className="text-xs text-slate-500">
              You can adjust team names or add new participating club teams
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {editableTeams.length} Teams Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {editableTeams.map((team, idx) => (
            <div
              key={team.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{team.avatar}</span>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={team.name}
                    placeholder={idx === 0 ? 'Your Team Name' : `Team ${idx + 1}`}
                    onChange={(e) => {
                      handleUpdateName(team.id, e.target.value);
                      if (idx === 0) setMyTeamName(e.target.value);
                    }}
                    className="w-full bg-transparent border-b border-slate-300 focus:border-indigo-600 text-sm font-bold text-slate-900 focus:outline-none py-0.5 truncate"
                  />
                  <span className="text-[11px] font-mono text-amber-700 flex items-center gap-1 font-semibold">
                    <Coins className="w-3 h-3 text-amber-500" /> 100 Coins Starting Vault
                  </span>
                </div>
              </div>

              {editableTeams.length > 2 && idx !== 0 && (
                <button
                  type="button"
                  onClick={() => handleRemoveTeam(team.id)}
                  title="Remove Team"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Team Row */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add new team (e.g. Algorithm Aces)..."
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 font-medium"
          />
          <button
            type="button"
            id="btn-add-team"
            onClick={handleAddTeam}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs border border-slate-800 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Team
          </button>
        </div>
      </div>
    </div>
  );
};
