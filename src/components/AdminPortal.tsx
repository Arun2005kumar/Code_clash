import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
  KeyRound,
  Mail,
  Loader2,
  ExternalLink,
  ChevronRight,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import { Team, CompetitionSession } from '../types';
import {
  adminSignIn,
  adminSignOut,
  getAdminSession,
  onAdminAuthStateChange,
  fetchAllTeams,
  fetchAllSessions,
  fetchTeamAnswers,
  subscribeToAdminRealtime,
  isSupabaseConfigured,
} from '../lib/supabase';
import { playClickSound, playTickSound } from '../utils/audio';

interface AdminPortalProps {
  onBackToApp: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToApp }) => {
  // 1. Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // 2. Dashboard Data State (NEVER loaded before auth)
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<CompetitionSession[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // 3. UI Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, active, completed, time_expired, round1, round2
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamAnswers, setSelectedTeamAnswers] = useState<any[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState<boolean>(false);

  // Periodic Timer Clock to update countdown displays every second
  const [, setClockTicker] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setClockTicker(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check Supabase Auth Session on mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      // Check for active session in Supabase Auth
      const session = await getAdminSession();
      if (isMounted) {
        if (session && session.user) {
          setIsAuthenticated(true);
        } else {
          // Check if admin token exists in session storage
          const stored = sessionStorage.getItem('codeclash_admin_session');
          if (stored === 'active_authenticated') {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
        setIsAuthChecking(false);
      }
    }

    checkAuth();

    // Listen for auth state changes
    const unsubAuth = onAdminAuthStateChange((session) => {
      if (session) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      isMounted = false;
      unsubAuth();
    };
  }, []);

  // Fetch Dashboard Data once Authenticated
  const refreshDashboardData = async () => {
    if (!isAuthenticated) return;
    setIsLoadingData(true);
    try {
      const [fetchedTeams, fetchedSessions] = await Promise.all([
        fetchAllTeams(),
        fetchAllSessions(),
      ]);
      setTeams(fetchedTeams);
      setSessions(fetchedSessions);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshDashboardData();

      // PART 20: Supabase Realtime Subscription for Live Updates
      const unsubRealtime = subscribeToAdminRealtime(() => {
        refreshDashboardData();
      });

      return () => {
        unsubRealtime();
      };
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Please enter both administrator email and password.');
      return;
    }

    setIsLoggingIn(true);
    setAuthError(null);
    playClickSound();

    try {
      if (isSupabaseConfigured()) {
        const res = await adminSignIn(email, password);
        if (res.error) {
          // If Supabase Auth fails, check if the admin is using the competition master pass
          if (
            email.trim().toLowerCase() === 'admin@codeclash.com' &&
            password === 'Admin@CodeClash2026'
          ) {
            sessionStorage.setItem('codeclash_admin_session', 'active_authenticated');
            setIsAuthenticated(true);
          } else {
            setAuthError(res.error);
          }
        } else {
          sessionStorage.setItem('codeclash_admin_session', 'active_authenticated');
          setIsAuthenticated(true);
        }
      } else {
        // Local mode authentication
        if (
          email.trim().toLowerCase() === 'admin@codeclash.com' &&
          password === 'Admin@CodeClash2026'
        ) {
          sessionStorage.setItem('codeclash_admin_session', 'active_authenticated');
          setIsAuthenticated(true);
        } else {
          setAuthError('Invalid credentials. Use admin@codeclash.com to sign in.');
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    playClickSound();
    await adminSignOut();
    sessionStorage.removeItem('codeclash_admin_session');
    sessionStorage.removeItem('codeclash_admin_auth');
    setIsAuthenticated(false);
    setTeams([]);
    setSessions([]);
    setSelectedTeam(null);
  };

  // Inspect Team Details & Fetch Individual Submissions (PART 23 & 24)
  const handleInspectTeam = async (team: Team) => {
    playClickSound();
    setSelectedTeam(team);
    setIsLoadingAnswers(true);
    try {
      const ans = await fetchTeamAnswers(team.id, 1);
      setSelectedTeamAnswers(ans);
    } catch (err) {
      console.warn('Answers fetch error:', err);
    } finally {
      setIsLoadingAnswers(false);
    }
  };

  // Compute live session stats for each team
  const sessionsByTeamId = useMemo(() => {
    const map = new Map<string, CompetitionSession>();
    sessions.forEach((s) => map.set(s.teamId, s));
    return map;
  }, [sessions]);

  // Live Summary Cards Metrics (PART 21)
  const metrics = useMemo(() => {
    const totalTeams = teams.length;
    let activeCount = 0;
    let round1Count = 0;
    let round2Count = 0;
    let completedCount = 0;
    let expiredCount = 0;

    teams.forEach((t) => {
      const sess = sessionsByTeamId.get(t.id);
      const isExpired = t.status === 'time_expired' || sess?.status === 'time_expired';
      const isComp = t.status === 'completed' || sess?.status === 'completed';

      if (isExpired) {
        expiredCount++;
      } else if (isComp) {
        completedCount++;
      } else {
        activeCount++;
      }

      if (t.currentRound === 'round1_mcq' || !t.currentRound) {
        round1Count++;
      } else if (t.currentRound.startsWith('round2')) {
        round2Count++;
      }
    });

    return {
      totalTeams,
      activeCount,
      round1Count,
      round2Count,
      completedCount,
      expiredCount,
    };
  }, [teams, sessionsByTeamId]);

  // Filtered and Searched Teams List (PART 25 & 26)
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      // Search query filter
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        team.name.toLowerCase().includes(q) ||
        team.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status / Round filter
      const sess = sessionsByTeamId.get(team.id);
      const isExpired = team.status === 'time_expired' || sess?.status === 'time_expired';
      const isComp = team.status === 'completed' || sess?.status === 'completed';

      if (statusFilter === 'round1') {
        return team.currentRound === 'round1_mcq' || !team.currentRound;
      }
      if (statusFilter === 'round2') {
        return team.currentRound?.startsWith('round2');
      }
      if (statusFilter === 'completed') {
        return isComp;
      }
      if (statusFilter === 'time_expired') {
        return isExpired;
      }
      if (statusFilter === 'active') {
        return !isComp && !isExpired;
      }

      return true;
    });
  }, [teams, searchTerm, statusFilter, sessionsByTeamId]);

  // Format countdown string for live session monitor (PART 27)
  const getSessionTimerDisplay = (teamId: string) => {
    const session = sessionsByTeamId.get(teamId);
    if (!session) return { text: 'Not Started', isExpired: false, isUrgent: false };

    if (session.status === 'time_expired') {
      return { text: '⏱ TIME EXPIRED (00:00)', isExpired: true, isUrgent: true };
    }
    if (session.status === 'completed') {
      return { text: 'Completed', isExpired: false, isUrgent: false };
    }

    const end = new Date(session.endTime).getTime();
    const remainingMs = end - Date.now();
    const remainingSec = Math.floor(remainingMs / 1000);

    if (remainingSec <= 0) {
      return { text: '⏱ TIME EXPIRED (00:00)', isExpired: true, isUrgent: true };
    }

    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    const isUrgent = remainingSec <= 300;

    return {
      text: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} remaining`,
      isExpired: false,
      isUrgent,
    };
  };

  // 1. Loading screen while auth is checked
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="flex items-center gap-3 text-sm font-mono">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Verifying Admin Authorization...</span>
        </div>
      </div>
    );
  }

  // 2. PART 17 & 19: Unauthenticated Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30 font-black text-2xl">
              <Shield className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-bold block">
              Department of CSE • CODE CLASH
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ADMIN CONTROL CENTER
            </h1>
            <p className="text-xs text-slate-400">
              Protected master administrative console. Authentication required.
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5"
          >
            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@codeclash.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 font-medium transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Secret Passkey
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 font-medium transition-all"
                />
              </div>
            </div>

            <button
              id="btn-admin-login"
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Sign In to Admin Portal</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Authorized Faculty & Admins</span>
              <button
                type="button"
                onClick={onBackToApp}
                className="text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Return to Competition <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin Dashboard View (PART 21 - 27)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs font-black">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  CODE CLASH
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase tracking-wider">
                  ADMIN CONTROL CENTER
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live Supabase Realtime Telemetry & Competition Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Realtime Connected</span>
            </div>

            <button
              id="btn-refresh-admin"
              onClick={refreshDashboardData}
              disabled={isLoadingData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
              title="Force Refresh Data"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-indigo-400' : ''}`}
              />
            </button>

            <button
              id="btn-back-to-app"
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Competition View</span>
            </button>

            <button
              id="btn-admin-signout"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* PART 21: Live Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-indigo-400" /> TOTAL TEAMS
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {metrics.totalTeams}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-emerald-400" /> ACTIVE TEAMS
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {metrics.activeCount}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-blue-400" /> ROUND 1
            </span>
            <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">
              {metrics.round1Count}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-3 h-3 text-amber-400" /> ROUND 2
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {metrics.round2Count}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> COMPLETED
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {metrics.completedCount}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-rose-400" /> TIME EXPIRED
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
              {metrics.expiredCount}
            </div>
          </div>
        </div>

        {/* Search & Round Filters (PART 25 & 26) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="admin-search-team"
              type="text"
              placeholder="Search team name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-white placeholder-slate-600 transition-all"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: 'ALL TEAMS' },
              { id: 'active', label: 'ACTIVE' },
              { id: 'round1', label: 'ROUND 1' },
              { id: 'round2', label: 'ROUND 2' },
              { id: 'completed', label: 'COMPLETED' },
              { id: 'time_expired', label: 'TIME EXPIRED' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* PART 22: Registered Teams Realtime Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Registered Competition Squads ({filteredTeams.length})</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Last Synced: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Round</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Timer Telemetry</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No teams found matching the active filters or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((t) => {
                    const timerInfo = getSessionTimerDisplay(t.id);
                    const isExp = t.status === 'time_expired' || timerInfo.isExpired;
                    const isComp = t.status === 'completed';

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{t.avatar || '⚡'}</span>
                            <div>
                              <div className="font-bold text-white text-sm">
                                {t.name}
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">
                                ID: {t.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]">
                            {t.currentRound === 'round1_mcq'
                              ? 'Round 1 (DSA)'
                              : t.currentRound === 'round1_result'
                              ? 'R1 Results'
                              : t.currentRound?.startsWith('round2')
                              ? 'Round 2 (Auction)'
                              : 'Registration'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {isExp ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px]">
                              TIME EXPIRED
                            </span>
                          ) : isComp ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                              COMPLETED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-[10px] animate-pulse">
                              ACTIVE
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-white font-bold text-sm">
                            {t.score} pts
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {t.correctCount || 0} Correct • {t.wrongCount || 0} Wrong
                          </div>
                        </td>

                        {/* PART 27: Admin Real-Time Timer Monitor */}
                        <td className="py-3.5 px-4 font-mono">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              timerInfo.isExpired
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : timerInfo.isUrgent
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-indigo-300 border border-slate-700'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {timerInfo.text}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                          {t.lastActiveAt
                            ? new Date(t.lastActiveAt).toLocaleTimeString()
                            : 'Active'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleInspectTeam(t)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* PART 23 & 24: Team Details & Full Answer Inspector Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTeam.avatar || '⚡'}</span>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {selectedTeam.name}
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      Team ID: {selectedTeam.id}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTeam(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs">
                {/* PART 23: Team Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">
                      Current Round
                    </span>
                    <span className="text-white font-mono font-bold text-sm">
                      {selectedTeam.currentRound}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">
                      Official Score
                    </span>
                    <span className="text-emerald-400 font-mono font-black text-sm">
                      {selectedTeam.score} pts
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">
                      Competition Status
                    </span>
                    <span className="text-indigo-400 font-mono font-bold text-sm">
                      {selectedTeam.status || 'Active'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">
                      Coins Bankroll
                    </span>
                    <span className="text-amber-400 font-mono font-bold text-sm">
                      {selectedTeam.coins} Coins
                    </span>
                  </div>
                </div>

                {/* Session Data */}
                {(() => {
                  const s = sessionsByTeamId.get(selectedTeam.id);
                  if (!s) return null;
                  return (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
                      <div className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                        Round 1 Official Session Timestamps
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                        <div>
                          Start Time: <span className="text-white">{new Date(s.startTime).toLocaleTimeString()}</span>
                        </div>
                        <div>
                          End Time: <span className="text-white">{new Date(s.endTime).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* PART 24: Individual Answer Inspector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Submitted Answers & Scoring Ledger
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      {selectedTeamAnswers.length} recorded submissions
                    </span>
                  </div>

                  {isLoadingAnswers ? (
                    <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2 font-mono">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Loading question responses from database...</span>
                    </div>
                  ) : selectedTeamAnswers.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500">
                      No question answers recorded yet for this team.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                      {selectedTeamAnswers.map((ans, idx) => (
                        <div
                          key={ans.id || idx}
                          className="p-3.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-mono font-bold flex items-center justify-center text-[11px]">
                              Q{ans.question_id}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>Selected Option:</span>
                                {ans.selected_answer !== null && ans.selected_answer !== undefined ? (
                                  <span className="font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                                    Option {String.fromCharCode(65 + ans.selected_answer)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">Unanswered</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Timestamp: {new Date(ans.answered_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 font-mono">
                            {ans.is_correct ? (
                              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> +10 Pts
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1 text-[11px]">
                                <XCircle className="w-3.5 h-3.5" /> 0 Pts
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
