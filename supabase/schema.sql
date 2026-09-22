-- ==============================================================================
-- CODE CLASH — SUPABASE DATABASE SCHEMA (PRODUCTION UPGRADE)
-- PostgreSQL schema for teams, participants, sessions, questions, answers, & round results
-- Run this script in your Supabase Project > SQL Editor
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_name TEXT NOT NULL,
  normalized_team_name TEXT UNIQUE NOT NULL,
  avatar TEXT DEFAULT '⚡',
  color TEXT DEFAULT 'from-indigo-500 to-blue-600',
  coins INTEGER NOT NULL DEFAULT 100,
  score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  bids_won INTEGER NOT NULL DEFAULT 0,
  current_round TEXT NOT NULL DEFAULT 'registration',
  status TEXT NOT NULL DEFAULT 'active',
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_normalized_name ON public.teams(normalized_team_name);
CREATE INDEX IF NOT EXISTS idx_teams_score ON public.teams(score DESC);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);

-- 2. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  leader_name TEXT NOT NULL,
  register_number TEXT NOT NULL,
  section TEXT NOT NULL,
  members TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_team_id ON public.participants(team_id);

-- 3. COMPETITION SESSIONS TABLE (ROUND 1 & 2 OFFICIAL TIMERS)
CREATE TABLE IF NOT EXISTS public.competition_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL,
  current_question INTEGER NOT NULL DEFAULT 0,
  selected_answers JSONB DEFAULT '{}'::jsonb,
  marked_for_review JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active', -- 'not_started', 'active', 'time_expired', 'completed', 'submitted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_round_session UNIQUE (team_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_comp_sessions_team_round ON public.competition_sessions(team_id, round_number);
CREATE INDEX IF NOT EXISTS idx_comp_sessions_status ON public.competition_sessions(status);

-- 4. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id INTEGER PRIMARY KEY,
  round_number INTEGER NOT NULL,
  category TEXT DEFAULT 'General',
  question_text TEXT NOT NULL,
  code_snippet TEXT DEFAULT '',
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer INTEGER NOT NULL, -- index 0, 1, 2, or 3
  explanation TEXT DEFAULT '',
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_round ON public.questions(round_number);

-- 5. ANSWERS / SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_answer INTEGER, -- index chosen (0, 1, 2, 3) or NULL if unanswered
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'unanswered', 'time_expired'
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_round_question UNIQUE (team_id, round_number, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_team_round ON public.answers(team_id, round_number);

-- 6. ROUND RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.round_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  attempted INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT TRUE,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  completion_reason TEXT NOT NULL DEFAULT 'manual_submit', -- 'manual_submit' or 'time_expired'
  status TEXT NOT NULL DEFAULT 'completed',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_round_result UNIQUE (team_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_round_results_team_round ON public.round_results(team_id, round_number);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;

-- 1. Teams: Public competition participation access
CREATE POLICY "Allow public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update teams" ON public.teams FOR UPDATE USING (true);

-- 2. Participants
CREATE POLICY "Allow public read participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert participants" ON public.participants FOR INSERT WITH CHECK (true);

-- 3. Competition Sessions
CREATE POLICY "Allow public read competition_sessions" ON public.competition_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public write competition_sessions" ON public.competition_sessions FOR ALL USING (true);

-- 4. Questions
CREATE POLICY "Allow public read questions" ON public.questions FOR SELECT USING (true);

-- 5. Answers
CREATE POLICY "Allow public read answers" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Allow public write answers" ON public.answers FOR ALL USING (true);

-- 6. Round Results
CREATE POLICY "Allow public read round_results" ON public.round_results FOR SELECT USING (true);
CREATE POLICY "Allow public write round_results" ON public.round_results FOR ALL USING (true);

-- ==============================================================================
-- SUPABASE REALTIME REPLICATION CONFIGURATION
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'teams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'competition_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'round_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.round_results;
  END IF;
END $$;
