import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bookmark, RotateCcw, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Round1Question, Round1UserAnswer, ParticipantInfo } from '../types';
import { playTickSound, playCoinSound } from '../utils/audio';

interface Round1QuizProps {
  questions: Round1Question[];
  participant: ParticipantInfo;
  onSubmit: (answers: Record<number, number | null>, timeSpent: number) => void;
}

export const Round1Quiz: React.FC<Round1QuizProps> = ({
  questions,
  participant,
  onSubmit,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Timer tracking seconds spent in Round 1
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentQ = questions[currentIndex];
  const selectedOption = answers[currentQ.id] ?? null;
  const isMarked = !!markedForReview[currentQ.id];

  const handleSelectOption = (optionIndex: number) => {
    playTickSound();
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  const handleClearSelection = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const handleToggleReview = () => {
    playTickSound();
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const handleNext = () => {
    playTickSound();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    playTickSound();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const totalAnswered = Object.values(answers).filter((val) => val !== null && val !== undefined).length;
  const totalMarked = Object.values(markedForReview).filter(Boolean).length;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const confirmSubmit = () => {
    playCoinSound();
    onSubmit(answers, timeSpent);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner with Quiz Progress & Time */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold flex items-center justify-center">
            R1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Round 1: DSA & Core MCQ</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                {participant.teamName || 'Candidate Team'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Total 10 Questions • Answer and Submit to view marks</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block font-medium">Time Elapsed</span>
            <span className="font-mono text-lg font-bold text-indigo-600">{formatTimer(timeSpent)}</span>
          </div>

          <button
            id="btn-trigger-submit"
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Submit Test
          </button>
        </div>
      </div>

      {/* Main Grid: Question Content + Question Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Question (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
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

              <button
                id="btn-toggle-mark-review"
                onClick={handleToggleReview}
                className={`text-xs flex items-center gap-1 px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isMarked
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                {isMarked ? 'Marked for Review' : 'Mark for Review'}
              </button>
            </div>

            {/* Question Text */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 leading-relaxed">
              {currentQ.question}
            </h3>

            {/* Code Snippet Box (if any) */}
            {currentQ.codeSnippet && (
              <div className="mb-6 rounded-xl bg-slate-900 p-4 border border-slate-800 overflow-x-auto font-mono text-xs sm:text-sm text-indigo-200 leading-relaxed shadow-inner">
                <pre>{currentQ.codeSnippet}</pre>
              </div>
            )}

            {/* MCQ Options List */}
            <div className="space-y-3 mb-6">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                return (
                  <button
                    key={idx}
                    id={`btn-option-${currentQ.id}-${idx}`}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-xl border flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-black'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-sm font-medium leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Question Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                id="btn-clear-selection"
                onClick={handleClearSelection}
                disabled={selectedOption === null}
                className="text-xs text-slate-500 hover:text-rose-600 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Response
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-prev-question"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  id="btn-next-question"
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Question Navigator Palette (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs font-mono text-slate-500">
                {totalAnswered} / {questions.length} Answered
              </span>
            </h4>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-600" /> Answered ({totalAnswered})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" /> Review ({totalMarked})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /> Not Answered ({questions.length - totalAnswered})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded ring-2 ring-indigo-500 bg-white" /> Current
              </div>
            </div>

            {/* Palette Grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAns = answers[q.id] !== undefined && answers[q.id] !== null;
                const isRev = !!markedForReview[q.id];
                const isCurr = currentIndex === idx;

                let bgClass = 'bg-slate-50 text-slate-700 border-slate-200';
                if (isAns && isRev) {
                  bgClass = 'bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-400';
                } else if (isAns) {
                  bgClass = 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-2xs';
                } else if (isRev) {
                  bgClass = 'bg-amber-50 text-amber-800 border-amber-300';
                }

                return (
                  <button
                    key={q.id}
                    id={`btn-palette-${idx + 1}`}
                    onClick={() => {
                      playTickSound();
                      setCurrentIndex(idx);
                    }}
                    className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${bgClass} ${
                      isCurr ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white scale-105' : 'hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Quick Submit Block */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                id="btn-sidebar-submit"
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Submit MCQ Assessment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Confirm MCQ Submission</h3>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to finish Round 1? You will instantly see your marks and detailed answer evaluation.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Total Questions:</span> <span className="text-slate-900 font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Answered:</span> <span className="text-emerald-700 font-bold">{totalAnswered}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unanswered:</span> <span className="text-rose-700 font-bold">{questions.length - totalAnswered}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Marked for Review:</span> <span className="text-amber-700 font-bold">{totalMarked}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-cancel-submit"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Back to Test
              </button>
              <button
                id="btn-confirm-submit"
                onClick={confirmSubmit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Confirm & View Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
