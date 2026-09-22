import React, { useState } from 'react';
import { Sparkles, Users, Award, Clock, ArrowRight, ShieldCheck, Coins, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { ParticipantInfo } from '../types';
import { playTickSound, playCorrectSound } from '../utils/audio';
import { normalizeTeamName } from '../lib/supabase';

interface RegistrationViewProps {
  participant: ParticipantInfo;
  onUpdateParticipant: (info: ParticipantInfo) => void;
  onStartRound1: () => void;
  onDirectToRound2: () => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({
  participant,
  onUpdateParticipant,
  onStartRound1,
  onDirectToRound2,
}) => {
  const [formData, setFormData] = useState<ParticipantInfo>(participant);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [identifiedTeam, setIdentifiedTeam] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanTeamName = formData.teamName ? formData.teamName.trim().replace(/\s+/g, ' ') : '';
    if (!cleanTeamName) {
      setValidationError('Please enter your team name to continue.');
      return;
    }

    if (!formData.leaderName.trim()) {
      setValidationError('Please enter team leader name.');
      return;
    }

    if (!formData.registerNumber.trim()) {
      setValidationError('Please enter register number / roll no.');
      return;
    }

    if (!formData.section.trim()) {
      setValidationError('Please enter department / section.');
      return;
    }

    playCorrectSound();
    setIdentifiedTeam(cleanTeamName);

    const sanitizedInfo: ParticipantInfo = {
      ...formData,
      teamName: cleanTeamName,
      leaderName: formData.leaderName.trim(),
      registerNumber: formData.registerNumber.trim(),
      section: formData.section.trim(),
      members: formData.members.trim(),
    };

    onUpdateParticipant(sanitizedInfo);

    // Brief premium confirmation animation then navigate
    setTimeout(() => {
      onStartRound1();
    }, 700);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Event Header Card */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Department of CSE • Annual Club Activity
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
          CODE <span className="text-indigo-600">CLASH</span>
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto text-base sm:text-lg">
          The two-stage coding showdown: Battle through high-speed Data Structures & Algorithms,
          then enter the high-stakes <span className="text-indigo-600 font-bold">Bid Auction Arena</span>.
        </p>
      </div>

      {/* Two Rounds Structure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Round 1 Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden transition-all duration-200 hover:border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              Round 1
            </span>
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" /> 10 Questions
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">DSA & Core CSE MCQ</h2>
          <p className="text-slate-600 text-sm mb-4">
            Test your algorithmic prowess across Trees, Graphs, Stacks, Pointers, and OS fundamentals.
            Instant score generation upon submission.
          </p>
          <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 font-bold">✓</span> Timed core assessment
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 font-bold">✓</span> Instant marks & qualification review
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> Proceed to Round 2 unlocks upon completion
            </li>
          </ul>
        </div>

        {/* Round 2 Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden transition-all duration-200 hover:border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              Round 2 Grand Final
            </span>
            <span className="text-xs text-amber-700 font-mono flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> 40 Minutes Total
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            The Bid Auction Arena <Coins className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            High-octane strategy auction. Each team starts with <strong className="text-slate-900">100 Coins</strong>.
            Bid highest to win the question right. Correct = <strong className="text-emerald-700 font-bold">+10 pts</strong>, Wrong = <strong className="text-rose-700 font-bold">-10 pts</strong>.
          </p>
          <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 font-bold">✓</span> <strong>5 Code Questions</strong>: Predict output & algorithmic logic
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 font-bold">✓</span> <strong>5 Creative Puzzles</strong>: Film riddles & CSE emoji decoders
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 font-bold">✓</span> Real-time bidding war with live 40-minute master clock
            </li>
          </ul>
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs relative">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Team & Participant Details</h3>
            <p className="text-xs text-slate-500">Manual entry required • Enter your unique team credentials</p>
          </div>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Identified Team Flash Card */}
        {identifiedTeam && (
          <div className="mb-5 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 animate-bounce" />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                  TEAM IDENTIFIED
                </span>
                <span className="text-base font-black">{identifiedTeam}</span>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-600 font-bold animate-pulse">
              Entering Assessment...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Team Name <span className="text-indigo-600">*</span>
              </label>
              <input
                id="input-team-name"
                type="text"
                required
                value={formData.teamName}
                onChange={(e) => {
                  setFormData({ ...formData, teamName: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                placeholder="Enter Team Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Type your team name manually (no default values)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Team Leader Name <span className="text-indigo-600">*</span>
              </label>
              <input
                id="input-leader-name"
                type="text"
                required
                value={formData.leaderName}
                onChange={(e) => {
                  setFormData({ ...formData, leaderName: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                placeholder="Enter Leader Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Register Number / Roll No <span className="text-indigo-600">*</span>
              </label>
              <input
                id="input-reg-number"
                type="text"
                required
                value={formData.registerNumber}
                onChange={(e) => {
                  setFormData({ ...formData, registerNumber: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. 717822P101"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Department / Section <span className="text-indigo-600">*</span>
              </label>
              <input
                id="input-section"
                type="text"
                required
                value={formData.section}
                onChange={(e) => {
                  setFormData({ ...formData, section: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. CSE - III Year A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Additional Teammates (Optional)
            </label>
            <input
              id="input-members"
              type="text"
              value={formData.members}
              onChange={(e) => setFormData({ ...formData, members: e.target.value })}
              placeholder="e.g. Priya S., Vignesh R."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              id="btn-direct-round2"
              onClick={onDirectToRound2}
              className="text-xs text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" /> Coordinator shortcut: Jump directly to Round 2 Auction
            </button>

            <button
              id="btn-start-round1"
              type="submit"
              disabled={!!identifiedTeam}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Start Round 1: MCQ Challenge
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
