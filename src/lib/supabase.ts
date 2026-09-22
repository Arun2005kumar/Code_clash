import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import {
  ParticipantInfo,
  Round1ResultData,
  Team,
  CompetitionSession,
  CompetitionSessionStatus,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Normalizes team name to prevent duplicates due to spacing and case.
 * e.g., "  TECH   TITANS  " -> "tech titans"
 */
export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export interface DbTeam {
  id: string;
  team_name: string;
  normalized_team_name: string;
  avatar: string;
  color: string;
  coins: number;
  score: number;
  total_score: number;
  correct_count: number;
  wrong_count: number;
  bids_won: number;
  current_round: string;
  status: string;
  last_active_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Register a new team or fetch existing team by normalized name.
 */
export async function registerOrFindTeam(
  teamName: string,
  participantData?: ParticipantInfo
): Promise<{ team: Team; isExisting: boolean; error?: string }> {
  const cleanName = teamName.trim().replace(/\s+/g, ' ');
  const normalized = normalizeTeamName(cleanName);

  if (!cleanName) {
    return {
      team: {
        id: `team-local-${Date.now()}`,
        name: '',
        avatar: '⚡',
        color: 'from-indigo-500 to-blue-600',
        badgeColor: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/40',
        coins: 100,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        bidsWon: 0,
      },
      isExisting: false,
      error: 'Please enter your team name.',
    };
  }

  // If Supabase is configured, use PostgreSQL
  if (supabase) {
    try {
      // 1. Check if team already exists
      const { data: existing, error: findError } = await supabase
        .from('teams')
        .select('*')
        .eq('normalized_team_name', normalized)
        .maybeSingle();

      if (findError) {
        console.warn('Supabase find team warning:', findError.message);
      }

      if (existing) {
        const teamObj: Team = {
          id: existing.id,
          name: existing.team_name,
          avatar: existing.avatar || '⚡',
          color: existing.color || 'from-indigo-500 to-blue-600',
          badgeColor: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/40',
          coins: existing.coins ?? 100,
          score: existing.score ?? existing.total_score ?? 0,
          correctCount: existing.correct_count ?? 0,
          wrongCount: existing.wrong_count ?? 0,
          bidsWon: existing.bids_won ?? 0,
          currentRound: existing.current_round,
          status: existing.status,
          lastActiveAt: existing.last_active_at,
        };
        return { team: teamObj, isExisting: true };
      }

      // 2. Insert new team
      const newTeamPayload = {
        team_name: cleanName,
        normalized_team_name: normalized,
        avatar: '⚡',
        color: 'from-indigo-500 to-blue-600',
        coins: 100,
        score: 0,
        total_score: 0,
        correct_count: 0,
        wrong_count: 0,
        bids_won: 0,
        current_round: 'round1_mcq',
        status: 'active',
        last_active_at: new Date().toISOString(),
      };

      const { data: insertedTeam, error: insertError } = await supabase
        .from('teams')
        .insert(newTeamPayload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // 3. Insert participant info if provided
      if (participantData && insertedTeam?.id) {
        await supabase.from('participants').insert({
          team_id: insertedTeam.id,
          leader_name: participantData.leaderName || 'Leader',
          register_number: participantData.registerNumber || '',
          section: participantData.section || '',
          members: participantData.members || '',
        });
      }

      const teamObj: Team = {
        id: insertedTeam.id,
        name: insertedTeam.team_name,
        avatar: insertedTeam.avatar,
        color: insertedTeam.color,
        badgeColor: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/40',
        coins: insertedTeam.coins,
        score: insertedTeam.score,
        correctCount: insertedTeam.correct_count,
        wrongCount: insertedTeam.wrong_count,
        bidsWon: insertedTeam.bids_won,
        currentRound: insertedTeam.current_round,
        status: insertedTeam.status,
      };

      return { team: teamObj, isExisting: false };
    } catch (err: any) {
      console.warn('Database registration fallback to local:', err?.message || err);
    }
  }

  // Fallback / Local Storage Mode
  const localId = `team-${Date.now()}`;
  const teamObj: Team = {
    id: localId,
    name: cleanName,
    avatar: '⚡',
    color: 'from-indigo-500 to-blue-600',
    badgeColor: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/40',
    coins: 100,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    bidsWon: 0,
  };

  return { team: teamObj, isExisting: false };
}

/**
 * Fetch or Initialize Competition Session (PART 1, 2, 3 - Exact 25-Minute Countdown)
 * Guarantees start_time and end_time are anchored in Supabase.
 */
export async function fetchOrCreateCompetitionSession(
  teamId: string,
  teamName: string,
  roundNumber: number = 1,
  durationMinutes: number = 25
): Promise<{ session: CompetitionSession; isNew: boolean }> {
  const fallbackStartTime = new Date();
  const fallbackEndTime = new Date(fallbackStartTime.getTime() + durationMinutes * 60 * 1000);

  const defaultSession: CompetitionSession = {
    teamId,
    teamName,
    roundNumber,
    startTime: fallbackStartTime.toISOString(),
    endTime: fallbackEndTime.toISOString(),
    currentQuestion: 0,
    selectedAnswers: {},
    markedForReview: {},
    status: 'active',
  };

  if (!supabase || !teamId || teamId.startsWith('team-local-')) {
    return { session: defaultSession, isNew: true };
  }

  try {
    // Check if session exists in Supabase
    const { data: existingSession, error: fetchErr } = await supabase
      .from('competition_sessions')
      .select('*')
      .eq('team_id', teamId)
      .eq('round_number', roundNumber)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Fetch session warning:', fetchErr.message);
    }

    if (existingSession) {
      const parsedSession: CompetitionSession = {
        id: existingSession.id,
        teamId: existingSession.team_id,
        teamName,
        roundNumber: existingSession.round_number,
        startTime: existingSession.start_time,
        endTime: existingSession.end_time,
        currentQuestion: existingSession.current_question ?? 0,
        selectedAnswers: (existingSession.selected_answers as Record<number, number | null>) || {},
        markedForReview: (existingSession.marked_for_review as Record<number, boolean>) || {},
        status: existingSession.status as CompetitionSessionStatus,
        updatedAt: existingSession.updated_at,
      };
      return { session: parsedSession, isNew: false };
    }

    // Create new session anchored at the exact moment Round 1 begins
    const newSessionPayload = {
      team_id: teamId,
      round_number: roundNumber,
      start_time: fallbackStartTime.toISOString(),
      end_time: fallbackEndTime.toISOString(),
      current_question: 0,
      selected_answers: {},
      marked_for_review: {},
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('competition_sessions')
      .insert(newSessionPayload)
      .select()
      .single();

    if (insertErr) {
      console.warn('Insert session error:', insertErr.message);
      return { session: defaultSession, isNew: true };
    }

    const createdSession: CompetitionSession = {
      id: inserted.id,
      teamId: inserted.team_id,
      teamName,
      roundNumber: inserted.round_number,
      startTime: inserted.start_time,
      endTime: inserted.end_time,
      currentQuestion: inserted.current_question,
      selectedAnswers: inserted.selected_answers || {},
      markedForReview: inserted.marked_for_review || {},
      status: inserted.status as CompetitionSessionStatus,
      updatedAt: inserted.updated_at,
    };

    return { session: createdSession, isNew: true };
  } catch (err) {
    console.warn('fetchOrCreateCompetitionSession exception:', err);
    return { session: defaultSession, isNew: true };
  }
}

/**
 * Auto-save Session Progress to Supabase (PART 7)
 */
export async function saveSessionProgress(
  teamId: string,
  roundNumber: number,
  data: {
    currentQuestion?: number;
    selectedAnswers?: Record<number, number | null>;
    markedForReview?: Record<number, boolean>;
    status?: CompetitionSessionStatus;
  }
): Promise<boolean> {
  if (!supabase || !teamId || teamId.startsWith('team-local-')) return false;

  try {
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.currentQuestion !== undefined) updatePayload.current_question = data.currentQuestion;
    if (data.selectedAnswers !== undefined) updatePayload.selected_answers = data.selectedAnswers;
    if (data.markedForReview !== undefined) updatePayload.marked_for_review = data.markedForReview;
    if (data.status !== undefined) updatePayload.status = data.status;

    const { error } = await supabase
      .from('competition_sessions')
      .update(updatePayload)
      .eq('team_id', teamId)
      .eq('round_number', roundNumber);

    if (error) {
      console.warn('saveSessionProgress warning:', error.message);
      return false;
    }

    // Also update team's last_active_at
    await supabase
      .from('teams')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', teamId);

    return true;
  } catch (err) {
    console.warn('saveSessionProgress exception:', err);
    return false;
  }
}

/**
 * Record an answer submission in the database (PART 5, 31 - Unique Submission)
 */
export async function recordAnswerSubmission(
  teamId: string,
  roundNumber: number,
  questionId: number,
  selectedAnswer: number | null,
  isCorrect: boolean,
  points: number,
  status: string = 'submitted'
): Promise<boolean> {
  if (!supabase || !teamId || teamId.startsWith('team-local-')) return false;

  try {
    const { error } = await supabase.from('answers').upsert(
      {
        team_id: teamId,
        round_number: roundNumber,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        points: points,
        status: status,
        answered_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,round_number,question_id' }
    );

    if (error) {
      console.warn('Record answer error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Record answer exception:', err);
    return false;
  }
}

/**
 * Record Round 1 results in the database (PART 4, 32 - Timeout & Completion)
 */
export async function recordRoundResult(
  teamId: string,
  roundNumber: number,
  result: Round1ResultData,
  completionReason: 'manual_submit' | 'time_expired' = 'manual_submit'
): Promise<boolean> {
  if (!supabase || !teamId || teamId.startsWith('team-local-')) return false;

  try {
    const { error } = await supabase.from('round_results').upsert(
      {
        team_id: teamId,
        round_number: roundNumber,
        score: result.score,
        total_questions: result.totalQuestions,
        attempted: result.attempted,
        correct: result.correct,
        wrong: result.wrong,
        percentage: result.percentage,
        time_spent_seconds: result.timeSpentSeconds,
        passed: result.passed,
        completed: true,
        completion_reason: completionReason,
        status: completionReason === 'time_expired' ? 'time_expired' : 'completed',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,round_number' }
    );

    if (error) {
      console.warn('Record round result error:', error.message);
      return false;
    }

    // Update team score, counts, round, and completion status in teams table
    await supabase
      .from('teams')
      .update({
        score: result.score,
        total_score: result.score,
        correct_count: result.correct,
        wrong_count: result.wrong,
        current_round: 'round1_result',
        status: completionReason === 'time_expired' ? 'time_expired' : 'completed',
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId);

    // Update session status
    await supabase
      .from('competition_sessions')
      .update({
        status: completionReason === 'time_expired' ? 'time_expired' : 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('round_number', roundNumber);

    return true;
  } catch (err) {
    console.warn('Record round result exception:', err);
    return false;
  }
}

/**
 * Update team progress (current round)
 */
export async function updateTeamRound(teamId: string, round: string): Promise<void> {
  if (!supabase || !teamId || teamId.startsWith('team-local-')) return;
  try {
    await supabase
      .from('teams')
      .update({
        current_round: round,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId);
  } catch (err) {
    console.warn('Update team round error:', err);
  }
}

/**
 * Fetch all teams from Supabase (for Admin Dashboard)
 */
export async function fetchAllTeams(): Promise<Team[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('score', { ascending: false });

    if (error) throw error;

    return (data || []).map((t) => ({
      id: t.id,
      name: t.team_name,
      avatar: t.avatar || '⚡',
      color: t.color || 'from-indigo-500 to-blue-600',
      badgeColor: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/40',
      coins: t.coins ?? 100,
      score: t.score ?? t.total_score ?? 0,
      correctCount: t.correct_count ?? 0,
      wrongCount: t.wrong_count ?? 0,
      bidsWon: t.bids_won ?? 0,
      currentRound: t.current_round || 'round1_mcq',
      status: t.status || 'active',
      lastActiveAt: t.last_active_at || t.updated_at || t.created_at,
    }));
  } catch (err) {
    console.warn('Fetch all teams error:', err);
    return [];
  }
}

/**
 * Fetch all competition sessions (for Admin Live Timers)
 */
export async function fetchAllSessions(): Promise<CompetitionSession[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('competition_sessions')
      .select('*, teams(team_name)')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((s) => ({
      id: s.id,
      teamId: s.team_id,
      teamName: s.teams?.team_name || 'Team',
      roundNumber: s.round_number,
      startTime: s.start_time,
      endTime: s.end_time,
      currentQuestion: s.current_question ?? 0,
      selectedAnswers: s.selected_answers || {},
      markedForReview: s.marked_for_review || {},
      status: s.status,
      updatedAt: s.updated_at,
    }));
  } catch (err) {
    console.warn('Fetch all sessions error:', err);
    return [];
  }
}

/**
 * Fetch detailed submissions / answers for a specific team
 */
export async function fetchTeamAnswers(teamId: string, roundNumber: number = 1): Promise<any[]> {
  if (!supabase || !teamId) return [];
  try {
    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .eq('team_id', teamId)
      .eq('round_number', roundNumber)
      .order('question_id', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Fetch team answers error:', err);
    return [];
  }
}

/**
 * Supabase Realtime Subscription for Admin Dashboard (PART 20)
 * Subscribes to teams, competition_sessions, answers, round_results.
 */
export function subscribeToAdminRealtime(
  onUpdate: () => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('admin-live-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_sessions' }, () => {
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'round_results' }, () => {
      onUpdate();
    })
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

/**
 * Supabase Authentication for Admin (PART 17, 18, 19)
 */
export async function adminSignIn(
  email: string,
  password: string
): Promise<{ session: Session | null; user: User | null; error: string | null }> {
  if (!supabase) {
    return {
      session: null,
      user: null,
      error: 'Supabase credentials are not configured in environment.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { session: null, user: null, error: error.message };
    }

    return { session: data.session, user: data.user, error: null };
  } catch (err: any) {
    return { session: null, user: null, error: err?.message || 'Authentication failed.' };
  }
}

export async function adminSignOut(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Sign out error:', err);
  }
}

export async function getAdminSession(): Promise<Session | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

export function onAdminAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  if (!supabase) return () => {};
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => {
    listener.subscription.unsubscribe();
  };
}

/**
 * Legacy/Modal admin overview fetcher
 */
export async function fetchAdminOverview(): Promise<{
  teams: any[];
  participants: any[];
  results: any[];
  answers: any[];
}> {
  if (!supabase) {
    return { teams: [], participants: [], results: [], answers: [] };
  }
  try {
    const [t, p, r, a] = await Promise.all([
      supabase.from('teams').select('*').order('score', { ascending: false }),
      supabase.from('participants').select('*'),
      supabase.from('round_results').select('*'),
      supabase.from('answers').select('*'),
    ]);
    return {
      teams: t.data || [],
      participants: p.data || [],
      results: r.data || [],
      answers: a.data || [],
    };
  } catch (err) {
    console.warn('fetchAdminOverview error:', err);
    return { teams: [], participants: [], results: [], answers: [] };
  }
}
