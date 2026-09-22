import React, { useState } from 'react';
import { Award, ArrowRight, CheckCircle2, XCircle, Clock, Zap, BookOpen, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { Round1Question, Round1ResultData, ParticipantInfo } from '../types';
import { playCorrectSound } from '../utils/audio';

interface Round1ResultProps {
  questions: Round1Question[];
  userAnswers: Record<number, number | null>;
  result: Round1ResultData;
  participant: ParticipantInfo;
  onProceedToRound2: () => void;
}

export const Round1Result: React.FC<Round1ResultProps> = ({
  questions,
  userAnswers,
  result,
  participant,
  onProceedToRound2,
}) => {
  const [showReview, setShowReview] = useState<boolean>(false);

  React.useEffect(() => {
    playCorrectSound();
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Result Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs text-center relative overflow-hidden">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Award className="w-4 h-4 text-indigo-600" /> Round 1 MCQ Assessment Complete
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Performance Scorecard
        </h1>
        <p className="text-slate-600 text-sm max-w-xl mx-auto mb-8">
          Candidate Team: <span className="text-slate-900 font-bold">{participant.teamName || 'Registered Team'}</span>{' '}
          {participant.leaderName ? `(${participant.leaderName}${participant.section ? ` • ${participant.section}` : ''})` : ''}
        </p>

        {/* Big Marks Metric */}
        <div className="inline-flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-2xs mb-8">
          <div className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 font-mono">
            {result.score} <span className="text-2xl text-slate-400 font-normal">/ {result.totalQuestions}</span>
          </div>
          <div className="text-xs uppercase font-bold tracking-widest text-slate-500 mt-2">
            Total Marks ({result.percentage}%)
          </div>
        </div>

        {/* 4 Stat Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-8">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Correct</span>
            <span className="text-xl font-bold text-emerald-700 font-mono flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {result.correct}
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Wrong</span>
            <span className="text-xl font-bold text-rose-700 font-mono flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4 text-rose-600" /> {result.wrong}
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Accuracy</span>
            <span className="text-xl font-bold text-indigo-700 font-mono flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 text-indigo-600" /> {result.percentage}%
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Time Spent</span>
            <span className="text-xl font-bold text-slate-800 font-mono flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-slate-500" /> {formatTimer(result.timeSpentSeconds)}
            </span>
          </div>
        </div>

        {/* CRITICAL: "PROCEED TO ROUND 2" BUTTON */}
        <div className="pt-2 pb-2">
          <button
            id="btn-proceed-to-round-2"
            onClick={onProceedToRound2}
            className="px-8 sm:px-12 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 mx-auto transition-all shadow-xs cursor-pointer"
          >
            <span className="tracking-wide">PROCEED TO ROUND 2: BID AUCTION</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <p className="text-xs text-slate-500 font-medium mt-3">
            Next Stage: 10 Questions • 100 Starting Coins • Bidding Auction • 40-Minute Countdown
          </p>
        </div>
      </div>

      {/* Review Questions Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <button
          id="btn-toggle-answer-review"
          onClick={() => setShowReview(!showReview)}
          className="w-full flex items-center justify-between text-left text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Review Round 1 Questions & Detailed Explanations</span>
          </div>
          {showReview ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {showReview && (
          <div className="mt-5 space-y-4 pt-4 border-t border-slate-200">
            {questions.map((q, idx) => {
              const userAns = userAnswers[q.id];
              const isCorrect = userAns === q.correctAnswer;
              const isUnanswered = userAns === null || userAns === undefined;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border ${
                    isCorrect
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : isUnanswered
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-rose-50/60 border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold font-mono text-slate-600">
                      Q{idx + 1}. [{q.category}]
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : isUnanswered
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCorrect ? 'Correct (+1)' : isUnanswered ? 'Not Attempted' : 'Incorrect (0)'}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 mb-2">{q.question}</p>

                  {q.codeSnippet && (
                    <div className="mb-3 rounded-lg bg-slate-900 p-3 font-mono text-xs text-indigo-200 border border-slate-800 overflow-x-auto">
                      <pre>{q.codeSnippet}</pre>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                    {q.options.map((opt, optIdx) => {
                      const isOptionCorrect = optIdx === q.correctAnswer;
                      const isOptionUser = optIdx === userAns;

                      let optClass = 'bg-white border-slate-200 text-slate-700';
                      if (isOptionCorrect) {
                        optClass = 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-semibold';
                      } else if (isOptionUser && !isCorrect) {
                        optClass = 'bg-rose-100/70 border-rose-300 text-rose-900';
                      }

                      return (
                        <div key={optIdx} className={`p-2.5 rounded-lg border flex items-center gap-2 ${optClass}`}>
                          <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                          <span>{opt}</span>
                          {isOptionCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                          {isOptionUser && !isCorrect && <XCircle className="w-3.5 h-3.5 text-rose-600 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    <strong className="text-indigo-700">Explanation: </strong> {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
