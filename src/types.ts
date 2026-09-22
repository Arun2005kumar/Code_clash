export type AppRound = 'registration' | 'round1_mcq' | 'round1_result' | 'round2_intro' | 'round2_auction' | 'final_podium';

export type UserRole = 'admin' | 'team' | 'projector';

export interface SystemSession {
  role: UserRole;
  selectedTeamId?: string;
}

export interface ParticipantInfo {
  teamName: string;
  leaderName: string;
  members: string;
  registerNumber: string;
  section: string;
}

export interface Round1Question {
  id: number;
  category: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Round1UserAnswer {
  questionId: number;
  selectedOption: number | null;
  isMarkedForReview: boolean;
}

export interface Round1ResultData {
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  score: number;
  percentage: number;
  timeSpentSeconds: number;
  passed: boolean;
  completionReason?: 'manual_submit' | 'time_expired';
}

export type Round2QuestionType = 'code_output' | 'code_correction' | 'cinematic_image' | 'emoji_riddle';

export interface Round2Question {
  id: number;
  type: Round2QuestionType;
  badge: string;
  title: string;
  prompt: string;
  codeSnippet?: string;
  language?: string;
  imageSrc?: string;
  emojis?: string[];
  hint?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  funFact?: string;
}

export interface Team {
  id: string;
  name: string;
  avatar: string;
  color: string;
  badgeColor: string;
  coins: number; // Starts with 100 coins
  score: number; // Starts with 0 points
  correctCount: number;
  wrongCount: number;
  bidsWon: number;
  currentRound?: string;
  status?: string;
  lastActiveAt?: string;
}

export interface BidRecord {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: number;
}

export interface AuctionQuestionResult {
  questionId: number;
  winningTeamId: string;
  winningBid: number;
  selectedOption: number;
  isCorrect: boolean;
  pointsDelta: number; // +10 or -10
}

export type CompetitionSessionStatus = 'not_started' | 'active' | 'time_expired' | 'completed' | 'submitted';

export interface CompetitionSession {
  id?: string;
  teamId: string;
  teamName: string;
  roundNumber: number;
  startTime: string; // ISO string
  endTime: string; // ISO string
  currentQuestion: number;
  selectedAnswers: Record<number, number | null>;
  markedForReview: Record<number, boolean>;
  status: CompetitionSessionStatus;
  updatedAt?: string;
}
