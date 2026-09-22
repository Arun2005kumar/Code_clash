/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppRound,
  ParticipantInfo,
  Team,
  Round1ResultData,
  UserRole
} from './types';
import { ROUND_1_QUESTIONS } from './data/round1Questions';
import { ROUND_2_QUESTIONS, INITIAL_TEAMS } from './data/round2Questions';
import { Header } from './components/Header';
import { RegistrationView } from './components/RegistrationView';
import { Round1Quiz } from './components/Round1Quiz';
import { Round1Result } from './components/Round1Result';
import { Round2Intro } from './components/Round2Intro';
import { Round2Auction } from './components/Round2Auction';
import { FinalPodium } from './components/FinalPodium';
import {
  loadSharedAuctionState,
  subscribeToAuctionSync,
  broadcastTimerSync,
} from './utils/auctionSync';

export default function App() {
  const [currentRound, setCurrentRound] = useState<AppRound>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roundParam = params.get('round') as AppRound;
      if (roundParam) return roundParam;
      if (params.get('role')) return 'round2_auction';
    }
    return 'registration';
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem('codeclash_admin_auth') === 'Arun0211';
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role') as UserRole;
      if (roleParam === 'admin' && isAuth) return 'admin';
      if (roleParam === 'team' || roleParam === 'projector') return roleParam;
    }
    return 'team';
  });

  // Participant Registration
  const [participant, setParticipant] = useState<ParticipantInfo>({
    teamName: 'Byte Brawlers',
    leaderName: 'Arun Kumar',
    members: 'Priya S., Vignesh R.',
    registerNumber: '717822P101',
    section: 'CSE - III Year',
  });

  // Round 1 State
  const [round1Answers, setRound1Answers] = useState<Record<number, number | null>>({});
  const [round1Result, setRound1Result] = useState<Round1ResultData>({
    totalQuestions: ROUND_1_QUESTIONS.length,
    attempted: 0,
    correct: 0,
    wrong: 0,
    score: 0,
    percentage: 0,
    timeSpentSeconds: 0,
    passed: true,
  });

  // Round 2 State (Teams with 100 coins each)
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);

  // 40-Minute Master Timer for Round 2 (40 * 60 = 2400 seconds)
  const [round2TimeLeft, setRound2TimeLeft] = useState<number>(40 * 60);
  const [isRound2TimerRunning, setIsRound2TimerRunning] = useState<boolean>(false);

  // Initialize timer from shared state
  useEffect(() => {
    const cached = loadSharedAuctionState();
    if (cached) {
      if (typeof cached.round2TimeLeft === 'number') {
        setRound2TimeLeft(cached.round2TimeLeft);
      }
      if (typeof cached.isRound2TimerRunning === 'boolean') {
        setIsRound2TimerRunning(cached.isRound2TimerRunning);
      }
    }
  }, []);

  // Listen for real-time timer sync across tabs/devices
  useEffect(() => {
    const unsubscribe = subscribeToAuctionSync((sharedState) => {
      if (typeof sharedState.round2TimeLeft === 'number') {
        setRound2TimeLeft(sharedState.round2TimeLeft);
      }
      if (typeof sharedState.isRound2TimerRunning === 'boolean') {
        setIsRound2TimerRunning(sharedState.isRound2TimerRunning);
      }
    });
    return () => unsubscribe();
  }, []);

  // 40-minute Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRound2TimerRunning && round2TimeLeft > 0) {
      interval = setInterval(() => {
        setRound2TimeLeft((prev) => {
          const next = Math.max(0, prev - 1);
          // Admin periodically broadcasts clock heartbeat so late-joining team terminals stay locked
          if (userRole === 'admin' && next % 2 === 0) {
            broadcastTimerSync(next, true);
          }
          return next;
        });
      }, 1000);
    } else if (round2TimeLeft === 0 && isRound2TimerRunning) {
      setIsRound2TimerRunning(false);
      if (userRole === 'admin') {
        broadcastTimerSync(0, false);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRound2TimerRunning, round2TimeLeft, userRole]);

  // Only Admin can toggle (pause/start) or reset the timer
  const handleToggleRound2Timer = () => {
    if (userRole !== 'admin') return;
    setIsRound2TimerRunning((prev) => {
      const next = !prev;
      broadcastTimerSync(round2TimeLeft, next);
      return next;
    });
  };

  const handleResetRound2Timer = () => {
    if (userRole !== 'admin') return;
    const resetTime = 40 * 60;
    setRound2TimeLeft(resetTime);
    setIsRound2TimerRunning(false);
    broadcastTimerSync(resetTime, false);
  };

  // Handlers for Round Transitions
  const handleStartRound1 = () => {
    setCurrentRound('round1_mcq');
  };

  const handleDirectToRound2 = () => {
    setIsRound2TimerRunning(true);
    setCurrentRound('round2_intro');
  };

  const handleSubmitRound1 = (answers: Record<number, number | null>, timeSpent: number) => {
    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;

    ROUND_1_QUESTIONS.forEach((q) => {
      const userChoice = answers[q.id];
      if (userChoice !== null && userChoice !== undefined) {
        attemptedCount += 1;
        if (userChoice === q.correctAnswer) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }
      }
    });

    const score = correctCount;
    const percentage = Math.round((correctCount / ROUND_1_QUESTIONS.length) * 100);

    setRound1Answers(answers);
    setRound1Result({
      totalQuestions: ROUND_1_QUESTIONS.length,
      attempted: attemptedCount,
      correct: correctCount,
      wrong: wrongCount,
      score: score,
      percentage: percentage,
      timeSpentSeconds: timeSpent,
      passed: percentage >= 40,
    });

    setCurrentRound('round1_result');
  };

  const handleProceedToRound2 = () => {
    // User pressed "Proceed to Round 2"
    setIsRound2TimerRunning(true);
    setCurrentRound('round2_intro');
  };

  const handleStartAuction = () => {
    setIsRound2TimerRunning(true);
    setCurrentRound('round2_auction');
  };

  const handleFinishAuction = () => {
    setCurrentRound('final_podium');
  };

  const handleRestartEvent = () => {
    setRound2TimeLeft(40 * 60);
    setIsRound2TimerRunning(false);
    setTeams(
      INITIAL_TEAMS.map((t) => ({
        ...t,
        coins: 100,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        bidsWon: 0,
      }))
    );
    setCurrentRound('registration');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Universal Header */}
      <Header
        currentRound={currentRound}
        round2TimeLeft={round2TimeLeft}
        isRound2TimerRunning={isRound2TimerRunning}
        userRole={userRole}
        onToggleRound2Timer={handleToggleRound2Timer}
        onResetRound2Timer={handleResetRound2Timer}
        onNavigateRound={setCurrentRound}
      />

      {/* Main Content Arena */}
      <main className="flex-1 pb-16">
        {currentRound === 'registration' && (
          <RegistrationView
            participant={participant}
            onUpdateParticipant={setParticipant}
            onStartRound1={handleStartRound1}
            onDirectToRound2={handleDirectToRound2}
          />
        )}

        {currentRound === 'round1_mcq' && (
          <Round1Quiz
            questions={ROUND_1_QUESTIONS}
            participant={participant}
            onSubmit={handleSubmitRound1}
          />
        )}

        {currentRound === 'round1_result' && (
          <Round1Result
            questions={ROUND_1_QUESTIONS}
            userAnswers={round1Answers}
            result={round1Result}
            participant={participant}
            onProceedToRound2={handleProceedToRound2}
          />
        )}

        {currentRound === 'round2_intro' && (
          <Round2Intro
            teams={teams}
            participant={participant}
            onUpdateTeams={setTeams}
            onStartAuction={handleStartAuction}
          />
        )}

        {currentRound === 'round2_auction' && (
          <Round2Auction
            questions={ROUND_2_QUESTIONS}
            teams={teams}
            onUpdateTeams={setTeams}
            onFinishEvent={handleFinishAuction}
            userRole={userRole}
            onRoleChange={setUserRole}
          />
        )}

        {currentRound === 'final_podium' && (
          <FinalPodium
            teams={teams}
            onRestart={handleRestartEvent}
            onBackToAuction={() => setCurrentRound('round2_auction')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Department of Computer Science & Engineering • <strong className="text-slate-800">CODE CLASH</strong>
          </span>
          <span className="font-mono text-slate-500">
            Round 1: DSA Assessment | Round 2: 100-Coin Bid Auction Arena (40m)
          </span>
        </div>
      </footer>
    </div>
  );
}
