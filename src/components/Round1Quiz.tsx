import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Lock,
  Wifi,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';
import { Round1Question, ParticipantInfo, Round1ResultData } from '../types';
import { playTickSound, playCoinSound, playCorrectSound, playWrongSound } from '../utils/audio';
import { persistence } from '../utils/persistence';
import {
  fetchOrCreateCompetitionSession,
  saveSessionProgress,
  recordAnswerSubmission,
  recordRoundResult,
  registerOrFindTeam,
} from '../lib/supabase';

interface Round1QuizProps {
  questions: Round1Question[];
  participant: ParticipantInfo;
  onSubmit: (answers: Record<number, number | null>, timeSpent: number) => void;
}

const ROUND_1_DURATION_SECONDS = 25 * 60; // 25 minutes = 1500 seconds

export const Round1Quiz: React.FC<Round1QuizProps> = ({
  questions,
  participant,
  onSubmit,
}) => {
  // Team ID resolved from database or fallback local
  const [teamId, setTeamId] = useState<string>('');

  // 1. Current Question Index
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const saved = persistence.loadRound1CurrentIndex();
    return saved >= 0 && saved < questions.length ? saved : 0;
  });

  // 2. Answers Map: { [questionId]: selectedOptionIndex | null }
  const [answers, setAnswers] = useState<Record<number, number | null>>(() => {
    return persistence.loadRound1Answers() || {};
  });

  // 3. Marked for Review Map
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>(() => {
    return persistence.loadRound1Marked() || {};
  });

  // 4. Timer End Timestamp (in Epoch ms) - Source of truth for 25-minute countdown
  const [endTimestamp, setEndTimestamp] = useState<number>(() => {
    const saved = persistence.loadRound1Timestamps();
    if (saved && saved.endTime > Date.now()) {
      return saved.endTime;
    }
    const initialStart = Date.now();
    const initialEnd = initialStart + ROUND_1_DURATION_SECONDS * 1000;
    persistence.saveRound1Timestamps(initialStart, initialEnd);
    return initialEnd;
  });

  // 5. Computed seconds left based on (endTimestamp - Date.now())
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    return Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
  });

  // 6. Round completion and timeout states
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(() => {
    const savedStatus = persistence.loadRound1Status();
    return savedStatus === 'time_expired' || savedStatus === 'completed';
  });
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const expiryHandledRef = useRef<boolean>(false);

  // Initialize or Fetch Official Supabase Competition Session on Mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        // First, ensure team is registered in Supabase
        const teamRes = await registerOrFindTeam(participant.teamName, participant);
        if (!isMounted) return;

        const resolvedTeamId = teamRes.team.id;
        setTeamId(resolvedTeamId);

        // Fetch official Supabase session with anchored start_time and end_time
        const sessionRes = await fetchOrCreateCompetitionSession(
          resolvedTeamId,
          participant.teamName,
          1,
          25 // 25 minutes
        );

        if (!isMounted) return;

        if (sessionRes.session) {
          const remoteEndTime = new Date(sessionRes.session.endTime).getTime();
          const remoteStartTime = new Date(sessionRes.session.startTime).getTime();

          // Sync local timestamps with database timestamps
          if (!isNaN(remoteEndTime) && remoteEndTime > remoteStartTime) {
            setEndTimestamp(remoteEndTime);
            persistence.saveRound1Timestamps(remoteStartTime, remoteEndTime);
          }

          // If session was already marked expired or completed in database
          if (
            sessionRes.session.status === 'time_expired' ||
            sessionRes.session.status === 'completed'
          ) {
            setIsTimeExpired(true);
            setShowTimeoutModal(true);
          }

          // Restore any remote answers if local answers were empty
          if (
            Object.keys(answers).length === 0 &&
            sessionRes.session.selectedAnswers &&
            Object.keys(sessionRes.session.selectedAnswers).length > 0
          ) {
            setAnswers(sessionRes.session.selectedAnswers);
            persistence.saveRound1Answers(sessionRes.session.selectedAnswers);
          }
        }
      } catch (err) {
        console.warn('Session init warning:', err);
        setNetworkError(true);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [participant.teamName]);

  // Main 25-Minute Countdown Interval based strictly on endTimestamp
  useEffect(() => {
    if (isTimeExpired) return;

    const tick = () => {
      const remainingMs = endTimestamp - Date.now();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setSecondsLeft(remainingSecs);

      // PART 4: Exact 25-minute expiry trigger
      if (remainingSecs <= 0 && !expiryHandledRef.current) {
        expiryHandledRef.current = true;
        handleTimeExpired();
      }
    };

    tick();
    const interval = setInterval(tick, 500); // 500ms precision prevents drift

    return () => clearInterval(interval);
  }, [endTimestamp, isTimeExpired]);

  // Sync state changes to local persistence
  useEffect(() => {
    persistence.saveRound1CurrentIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    persistence.saveRound1Answers(answers);
  }, [answers]);

  useEffect(() => {
    persistence.saveRound1Marked(markedForReview);
  }, [markedForReview]);

  // PART 7: Efficient Debounced Auto-Save to Supabase
  const triggerAutoSave = (
    newAnswers: Record<number, number | null>,
    newMarked: Record<number, boolean>,
    qIdx: number
  ) => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!teamId) return;
      setIsSyncing(true);
      try {
        await saveSessionProgress(teamId, 1, {
          currentQuestion: qIdx,
          selectedAnswers: newAnswers,
          markedForReview: newMarked,
          status: isTimeExpired ? 'time_expired' : 'active',
        });
        setNetworkError(false);
      } catch (e) {
        console.warn('Auto-save error:', e);
        setNetworkError(true);
      } finally {
        setIsSyncing(false);
      }
    }, 400);
  };

  // PART 4 & 5: Handle Exact 25-Minute Expiry
  const handleTimeExpired = async () => {
    setIsTimeExpired(true);
    setShowSubmitModal(false);
    setShowTimeoutModal(true);
    persistence.saveRound1Status('time_expired');
    playWrongSound();

    // Calculate final scores from existing valid answers (unanswered not invented)
    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;
    let totalScore = 0;

    questions.forEach((q) => {
      const selected = answers[q.id];
      if (selected !== null && selected !== undefined) {
        attemptedCount++;
        const isCorrect = selected === q.correctAnswer;
        if (isCorrect) {
          correctCount++;
          totalScore += 1;
        } else {
          wrongCount++;
        }

        // Save individual answer to Supabase
        if (teamId) {
          recordAnswerSubmission(
            teamId,
            1,
            q.id,
            selected,
            isCorrect,
            isCorrect ? 10 : 0,
            'submitted'
          ).catch(console.warn);
        }
      } else {
        // Save as unanswered (PART 5)
        if (teamId) {
          recordAnswerSubmission(
            teamId,
            1,
            q.id,
            null,
            false,
            0,
            'unanswered'
          ).catch(console.warn);
        }
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const resultData: Round1ResultData = {
      totalQuestions: questions.length,
      attempted: attemptedCount,
      correct: correctCount,
      wrong: wrongCount,
      score: totalScore,
      percentage: percentage,
      timeSpentSeconds: ROUND_1_DURATION_SECONDS,
      passed: percentage >= 40,
      completionReason: 'time_expired',
    };

    persistence.saveRound1Result(resultData);

    // Save timeout result to Supabase
    if (teamId) {
      await recordRoundResult(teamId, 1, resultData, 'time_expired');
    }
  };

  // Answer selection handler
  const handleSelectOption = (optionIndex: number) => {
    if (isTimeExpired) return; // Disallow selecting if expired
    playTickSound();

    const currentQ = questions[currentIndex] || questions[0];
    const newAnswers = {
      ...answers,
      [currentQ.id]: optionIndex,
    };
    setAnswers(newAnswers);

    // Auto-save to Supabase
    triggerAutoSave(newAnswers, markedForReview, currentIndex);

    // Record single answer submission to Supabase
    if (teamId) {
      const isCorrect = optionIndex === currentQ.correctAnswer;
      recordAnswerSubmission(
        teamId,
        1,
        currentQ.id,
        optionIndex,
        isCorrect,
        isCorrect ? 10 : 0,
        'submitted'
      ).catch(console.warn);
    }
  };

  const handleClearSelection = () => {
    if (isTimeExpired) return;
    const currentQ = questions[currentIndex] || questions[0];
    const copy = { ...answers };
    delete copy[currentQ.id];
    setAnswers(copy);
    triggerAutoSave(copy, markedForReview, currentIndex);

    if (teamId) {
      recordAnswerSubmission(teamId, 1, currentQ.id, null, false, 0, 'unanswered').catch(
        console.warn
      );
    }
  };

  const handleToggleReview = () => {
    if (isTimeExpired) return;
    playTickSound();
    const currentQ = questions[currentIndex] || questions[0];
    const newMarked = {
      ...markedForReview,
      [currentQ.id]: !markedForReview[currentQ.id],
    };
    setMarkedForReview(newMarked);
    triggerAutoSave(answers, newMarked, currentIndex);
  };

  const handleNext = () => {
    playTickSound();
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      triggerAutoSave(answers, markedForReview, nextIdx);
    }
  };

  const handlePrev = () => {
    playTickSound();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      triggerAutoSave(answers, markedForReview, prevIdx);
    }
  };

  // Format 25-minute countdown display (MM:SS)
  const formatCountdown = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Manual Confirmation Submission
  const confirmManualSubmit = async () => {
    if (isSubmitting || isTimeExpired) return; // Prevent double click
    setIsSubmitting(true);
    playCoinSound();

    try {
      let correctCount = 0;
      let wrongCount = 0;
      let attemptedCount = 0;
      let totalScore = 0;

      questions.forEach((q) => {
        const selected = answers[q.id];
        if (selected !== null && selected !== undefined) {
          attemptedCount++;
          const isCorrect = selected === q.correctAnswer;
          if (isCorrect) {
            correctCount++;
            totalScore += 1;
          } else {
            wrongCount++;
          }

          if (teamId) {
            recordAnswerSubmission(
              teamId,
              1,
              q.id,
              selected,
              isCorrect,
              isCorrect ? 10 : 0,
              'submitted'
            ).catch(console.warn);
          }
        } else {
          if (teamId) {
            recordAnswerSubmission(teamId, 1, q.id, null, false, 0, 'unanswered').catch(
              console.warn
            );
          }
        }
      });

      const percentage = Math.round((correctCount / questions.length) * 100);
      const timeSpent = Math.max(0, ROUND_1_DURATION_SECONDS - secondsLeft);

      const resultData: Round1ResultData = {
        totalQuestions: questions.length,
        attempted: attemptedCount,
        correct: correctCount,
        wrong: wrongCount,
        score: totalScore,
        percentage: percentage,
        timeSpentSeconds: timeSpent,
        passed: percentage >= 40,
        completionReason: 'manual_submit',
      };

      persistence.saveRound1Result(resultData);
      persistence.saveRound1Status('completed');

      if (teamId) {
        await recordRoundResult(teamId, 1, resultData, 'manual_submit');
      }

      setSubmitSuccess(true);
      playCorrectSound();

      setTimeout(() => {
        onSubmit(answers, timeSpent);
      }, 500);
    } catch (err) {
      console.warn('Submit error:', err);
      // Fallback submit
      onSubmit(answers, Math.max(0, ROUND_1_DURATION_SECONDS - secondsLeft));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex] || questions[0];
  const selectedOption = answers[currentQ.id] ?? null;
  const isMarked = !!markedForReview[currentQ.id];

  const totalAnswered = useMemo(() => {
    return Object.values(answers).filter((val) => val !== null && val !== undefined).length;
  }, [answers]);

  const totalMarked = useMemo(() => {
    return Object.values(markedForReview).filter(Boolean).length;
  }, [markedForReview]);

  // Visual urgency styling for countdown
  const timerColorClass =
    secondsLeft <= 60
      ? 'text-rose-600 animate-pulse bg-rose-50 border-rose-200'
      : secondsLeft <= 300
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-indigo-600 bg-indigo-50 border-indigo-200';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner with 25-Minute Countdown & Competition Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold flex items-center justify-center">
            R1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Round 1: Core DSA Assessment</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold">
                {participant.teamName || 'Registered Team'}
              </span>
              {isSyncing && (
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> Auto-saving
                </span>
              )}
              {networkError && (
                <span className="text-[10px] text-amber-700 font-mono flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <WifiOff className="w-3 h-3 text-amber-600" /> Offline cache active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              10 Algorithmic Questions • Exact 25-Minute Official Competition Timer
            </p>
          </div>
        </div>

        {/* 25-Minute Countdown Clock (PART 1, 2, 3) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 ${timerColorClass}`}
            >
              <Clock className="w-4 h-4" />
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider block leading-tight text-slate-500">
                  Time Remaining
                </span>
                <span className="font-mono text-xl font-black tracking-tight leading-none">
                  {formatCountdown(secondsLeft)}
                </span>
              </div>
            </div>
          </div>

          <button
            id="btn-trigger-submit"
            disabled={isTimeExpired || isSubmitting}
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Submit Test
          </button>
        </div>
      </div>

      {/* Main Grid: Question Content + Question Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Question (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs relative"
            >
              {isTimeExpired && (
                <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-10 rounded-2xl flex items-center justify-center pointer-events-none">
                  <div className="bg-white/95 border border-slate-200 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Lock className="w-4 h-4 text-rose-600" /> Round 1 Locked (Time Limit Reached)
                  </div>
                </div>
              )}

              {/* Question Meta Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs font-medium text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md">
                    {currentQ.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-mark-review"
                    disabled={isTimeExpired}
                    onClick={handleToggleReview}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isMarked
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        isMarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                      }`}
                    />
                    <span>{isMarked ? 'Marked for Review' : 'Mark Review'}</span>
                  </button>

                  {selectedOption !== null && (
                    <button
                      id="btn-clear-selection"
                      disabled={isTimeExpired}
                      onClick={handleClearSelection}
                      className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Clear Selection"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed mb-4">
                {currentQ.question}
              </h3>

              {/* Optional Code Snippet */}
              {currentQ.codeSnippet && (
                <div className="mb-6 rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                  <pre>{currentQ.codeSnippet}</pre>
                </div>
              )}

              {/* Options List (PART 4: Disabled when time expires) */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((optionText, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  return (
                    <button
                      key={optIdx}
                      id={`option-btn-${optIdx}`}
                      disabled={isTimeExpired}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-600 text-indigo-950 font-bold shadow-xs'
                          : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/60 text-slate-800'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 font-mono transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-xs sm:text-sm pt-0.5 leading-normal">
                        {optionText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  id="btn-prev-question"
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <div className="text-xs font-mono text-slate-500 font-bold">
                  {currentIndex + 1} / {questions.length}
                </div>

                <button
                  id="btn-next-question"
                  disabled={currentIndex === questions.length - 1}
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column: Question Palette & Legend (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Question Palette</span>
              <span className="font-mono text-indigo-600">
                {totalAnswered} / {questions.length}
              </span>
            </h4>

            {/* Grid of 10 Questions */}
            <div className="grid grid-cols-5 gap-2.5 mb-5">
              {questions.map((q, idx) => {
                const isAns = answers[q.id] !== null && answers[q.id] !== undefined;
                const isRev = !!markedForReview[q.id];
                const isCurr = currentIndex === idx;

                let btnBg = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                if (isAns && isRev) {
                  btnBg = 'bg-amber-100 text-amber-900 border-amber-300';
                } else if (isAns) {
                  btnBg = 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-2xs';
                } else if (isRev) {
                  btnBg = 'bg-amber-500 text-white border-amber-600 font-bold shadow-2xs';
                }

                return (
                  <button
                    key={q.id}
                    id={`palette-btn-${idx}`}
                    onClick={() => {
                      playTickSound();
                      setCurrentIndex(idx);
                    }}
                    className={`h-9 rounded-xl font-mono text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${btnBg} ${
                      isCurr ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Status Legend */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-[11px] font-medium text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-emerald-600" /> Answered
                </span>
                <span className="font-mono font-bold text-slate-900">{totalAnswered}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-amber-500" /> Marked for Review
                </span>
                <span className="font-mono font-bold text-slate-900">{totalMarked}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200" /> Not
                  Visited / Unanswered
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {questions.length - totalAnswered}
                </span>
              </div>
            </div>
          </div>

          {/* Guidelines Mini Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2 font-mono">
            <div className="font-bold text-slate-900 uppercase font-sans text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Competition Rules
            </div>
            <p className="text-[11px] font-sans leading-relaxed text-slate-500">
              Answers are automatically saved to Supabase in real time. When the 25-minute clock
              hits 00:00, Round 1 immediately locks and your scorecard is compiled.
            </p>
          </div>
        </div>
      </div>

      {/* PART 4: Exact 25-Minute Expiry Completion Screen / Modal */}
      <AnimatePresence>
        {showTimeoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase font-bold tracking-widest text-rose-600">
                  Official Countdown Reached 00:00
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ⏱ TIME COMPLETED
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-600 leading-relaxed text-left space-y-2">
                <p className="font-semibold text-slate-900">
                  Your 25-minute time limit has ended.
                </p>
                <p className="text-slate-600">
                  Your answers have been saved successfully to the database.
                </p>
                <p className="text-rose-700 font-bold">
                  Round 1 is now locked.
                </p>
              </div>

              <div className="pt-2">
                <button
                  id="btn-timeout-view-results"
                  onClick={() => {
                    setShowTimeoutModal(false);
                    onSubmit(answers, ROUND_1_DURATION_SECONDS);
                  }}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>View Round 1 Results</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Submission Modal */}
      {showSubmitModal && !showTimeoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Confirm MCQ Submission</h3>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to submit Round 1 now? Your marks will be calculated and saved
              to Supabase.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Total Questions:</span>
                <span className="text-slate-900 font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Answered:</span>
                <span className="text-emerald-700 font-bold">{totalAnswered}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unanswered:</span>
                <span className="text-rose-700 font-bold">{questions.length - totalAnswered}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Marked for Review:</span>
                <span className="text-amber-700 font-bold">{totalMarked}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time Remaining:</span>
                <span className="text-indigo-600 font-bold">{formatCountdown(secondsLeft)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-cancel-submit"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Back to Test
              </button>
              <button
                id="btn-confirm-submit"
                disabled={isSubmitting}
                onClick={confirmManualSubmit}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  submitSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Submitted ✓</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving to Supabase...</span>
                    </>
                  )
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & View Results</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
