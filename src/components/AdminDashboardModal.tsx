import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  X,
  Users,
  Award,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { Team } from '../types';
import {
  isSupabaseConfigured,
  fetchAdminOverview,
  fetchAllTeams,
} from '../lib/supabase';
import { playTickSound } from '../utils/audio';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  localTeams: Team[];
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  localTeams,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roundFilter, setRoundFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'coins' | 'name' | 'time'>('score');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const [dbData, setDbData] = useState<{
    teams: any[];
    participants: any[];
    results: any[];
    answers: any[];
  }>({
    teams: [],
    participants: [],
    results: [],
    answers: [],
  });

  const loadData = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured()) {
      const data = await fetchAdminOverview();
      setDbData(data);
    } else {
      // Fallback local teams representation
      setDbData({
        teams: localTeams.map((t) => ({
          id: t.id,
          team_name: t.name,
          normalized_team_name: t.name.toLowerCase(),
          coins: t.coins,
          score: t.score,
          correct_count: t.correctCount,
          wrong_count: t.wrongCount,
          bids_won: t.bidsWon,
          current_round: 'round2_auction',
          status: 'active',
          updated_at: new Date().toISOString(),
        })),
        participants: [],
        results: [],
        answers: [],
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Active teams pool
  const allTeams = dbData.teams.length > 0
    ? dbData.teams
    : localTeams.map((t) => ({
        id: t.id,
        team_name: t.name,
        normalized_team_name: t.name.toLowerCase(),
        coins: t.coins,
        score: t.score,
        correct_count: t.correctCount,
        wrong_count: t.wrongCount,
        bids_won: t.bidsWon,
        current_round: 'round2_auction',
        status: 'active',
        updated_at: new Date().toISOString(),
      }));

  // Filtering
  const filteredTeams = allTeams.filter((team: any) => {
    const nameMatch = team.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    const roundMatch = roundFilter === 'all' || team.current_round === roundFilter;
    const statusMatch = statusFilter === 'all' || team.status === statusFilter;
    return nameMatch && roundMatch && statusMatch;
  });

  // Sorting
  filteredTeams.sort((a: any, b: any) => {
    if (sortBy === 'score') return (b.score ?? 0) - (a.score ?? 0);
    if (sortBy === 'coins') return (b.coins ?? 100) - (a.coins ?? 100);
    if (sortBy === 'name') return a.team_name.localeCompare(b.team_name);
    if (sortBy === 'time') {
      return (
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
      );
    }
    return 0;
  });

  const getTeamParticipant = (teamId: string) => {
    return dbData.participants.find((p) => p.team_id === teamId);
  };

  const getTeamResult = (teamId: string, roundNumber = 1) => {
    return dbData.results.find(
      (r) => r.team_id === teamId && r.round_number === roundNumber
    );
  };

  const getTeamAnswers = (teamId: string, roundNumber = 1) => {
    return dbData.answers.filter(
      (a) => a.team_id === teamId && a.round_number === roundNumber
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  Competition Admin Console
                </h2>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isSupabaseConfigured()
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  {isSupabaseConfigured() ? 'PostgreSQL Connected' : 'Local Session Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Live monitoring, team records, score auditing, and round telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Warning if not configured */}
        {!isSupabaseConfigured() && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Database Notice:</strong> Supabase URL and anon key are not yet configured in environment variables. 
              Data is safely backed up in browser storage and local memory. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your Vercel project settings to enable remote PostgreSQL storage.
            </div>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          {/* Search */}
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search team name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Filter by Round */}
          <div>
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 font-medium"
            >
              <option value="all">Filter: All Rounds</option>
              <option value="registration">Registration</option>
              <option value="round1_mcq">Round 1 (DSA)</option>
              <option value="round1_result">Round 1 (Completed)</option>
              <option value="round2_intro">Round 2 (Intro)</option>
              <option value="round2_auction">Round 2 (Auction)</option>
              <option value="final_podium">Final Podium</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 font-medium"
            >
              <option value="all">Status: All Teams</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 font-medium"
            >
              <option value="score">Sort: Highest Score</option>
              <option value="coins">Sort: Most Coins</option>
              <option value="name">Sort: Team Name (A-Z)</option>
              <option value="time">Sort: Recently Active</option>
            </select>
          </div>
        </div>

        {/* Teams Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Team Name</th>
                <th className="py-3 px-4">Current Round</th>
                <th className="py-3 px-4">Total Score</th>
                <th className="py-3 px-4">Coin Vault</th>
                <th className="py-3 px-4">R1 Evaluation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No teams match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team: any) => {
                  const participant = getTeamParticipant(team.id);
                  const result = getTeamResult(team.id, 1);
                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-base">{team.avatar || '⚡'}</span>
                        <div>
                          <div>{team.team_name}</div>
                          {participant && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              Leader: {participant.leader_name} ({participant.register_number})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {team.current_round || 'round1_mcq'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 text-sm">
                        {team.score ?? 0} pts
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {team.coins ?? 100} Coins
                      </td>
                      <td className="py-3 px-4">
                        {result ? (
                          <div className="text-[11px] font-mono">
                            <span className="text-emerald-700 font-bold">
                              {result.correct}/{result.total_questions}
                            </span>
                            <span className="text-slate-400 ml-1">
                              ({result.percentage}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">In Progress</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            playTickSound();
                            setSelectedTeam(team);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Team Details Drawer/Modal */}
        {selectedTeam && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedTeam.avatar || '⚡'}</span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedTeam.team_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {selectedTeam.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Participant Details */}
              {(() => {
                const part = getTeamParticipant(selectedTeam.id);
                const r1 = getTeamResult(selectedTeam.id, 1);
                const answers = getTeamAnswers(selectedTeam.id, 1);
                return (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-800">Registration Info</div>
                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <div>
                          <strong>Leader:</strong> {part?.leader_name || 'N/A'}
                        </div>
                        <div>
                          <strong>Roll No:</strong> {part?.register_number || 'N/A'}
                        </div>
                        <div>
                          <strong>Section:</strong> {part?.section || 'N/A'}
                        </div>
                        <div>
                          <strong>Teammates:</strong> {part?.members || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 font-mono">
                      <div className="font-bold text-slate-800 font-sans">Performance Telemetry</div>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>Score: <strong className="text-indigo-600">{selectedTeam.score ?? 0} pts</strong></div>
                        <div>Coins: <strong className="text-amber-700">{selectedTeam.coins ?? 100}</strong></div>
                        <div>Correct: <strong className="text-emerald-700">{selectedTeam.correct_count ?? 0}</strong></div>
                        <div>Wrong: <strong className="text-rose-700">{selectedTeam.wrong_count ?? 0}</strong></div>
                        <div>Bids Won: <strong className="text-slate-900">{selectedTeam.bids_won ?? 0}</strong></div>
                        <div>Status: <strong className="text-slate-900">{selectedTeam.status || 'active'}</strong></div>
                      </div>
                    </div>

                    {r1 && (
                      <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 space-y-1 text-emerald-950 font-mono">
                        <div className="font-bold font-sans">Round 1 Summary</div>
                        <div>Score: {r1.score} / {r1.total_questions} ({r1.percentage}%)</div>
                        <div>Attempted: {r1.attempted} questions</div>
                        <div>Time Spent: {Math.floor((r1.time_spent_seconds || 0) / 60)}m {(r1.time_spent_seconds || 0) % 60}s</div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
