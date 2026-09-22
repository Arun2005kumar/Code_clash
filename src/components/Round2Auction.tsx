import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  Trophy,
  Gavel,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Code2,
  Image as ImageIcon,
  Smile,
  Clock,
  RotateCcw,
  Users,
  Lock,
  Unlock,
  Monitor,
  Laptop,
  ExternalLink,
  Shield,
  Key,
  Plus,
  Minus,
  Radio
} from 'lucide-react';
import {
  Round2Question,
  Team,
  BidRecord,
  AuctionQuestionResult,
  UserRole
} from '../types';
import {
  playCoinSound,
  playGavelSound,
  playCorrectSound,
  playWrongSound,
  playTickSound
} from '../utils/audio';
import { LeaderboardModal } from './LeaderboardModal';
import {
  SharedAuctionState,
  AuctionActionType,
  saveSharedAuctionState,
  loadSharedAuctionState,
  subscribeToAuctionSync
} from '../utils/auctionSync';

interface Round2AuctionProps {
  questions: Round2Question[];
  teams: Team[];
  onUpdateTeams: (updatedTeams: Team[]) => void;
  onFinishEvent: () => void;
  userRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const Round2Auction: React.FC<Round2AuctionProps> = ({
  questions,
  teams,
  onUpdateTeams,
  onFinishEvent,
  userRole: initialRole = 'admin',
  onRoleChange,
}) => {
  // System Role Mode
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roleParam = urlParams.get('role') as UserRole;
      if (roleParam === 'admin' || roleParam === 'team' || roleParam === 'projector') {
        return roleParam;
      }
    }
    return initialRole;
  });

  // Selected team if this terminal is a Team Client
  const [activeTeamId, setActiveTeamId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const teamParam = urlParams.get('teamId');
      if (teamParam) return teamParam;
    }
    return teams[0]?.id || 'team-1';
  });

  // Admin PIN Protection State - Password is "Arun0211"
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('codeclash_admin_auth') === 'Arun0211';
    }
    return false;
  });
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Round 2 Auction Core State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [stage, setStage] = useState<'bidding' | 'answering' | 'revealed'>('bidding');

  // Bidding State
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [highestBid, setHighestBid] = useState<number>(10);
  const [highestBidderId, setHighestBidderId] = useState<string | null>(null);
  const [customBidAmount, setCustomBidAmount] = useState<string>('15');

  // Answering State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // History & Results
  const [questionResults, setQuestionResults] = useState<AuctionQuestionResult[]>([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isLeaderboardBroadcasted, setIsLeaderboardBroadcasted] = useState<boolean>(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<{ message: string; type: 'success' | 'danger' | 'info' } | null>(null);

  const isBroadcastingRef = useRef<boolean>(false);

  // If user role is admin but not authenticated, show passcode modal immediately
  useEffect(() => {
    if (userRole === 'admin' && !isAdminUnlocked) {
      setShowPinModal(true);
    }
  }, [userRole, isAdminUnlocked]);

  // Initialize from shared storage if present
  useEffect(() => {
    const cached = loadSharedAuctionState();
    if (cached) {
      setCurrentQuestionIdx(cached.currentQuestionIdx ?? 0);
      setStage(cached.stage ?? 'bidding');
      setBids(cached.bids ?? []);
      setHighestBid(cached.highestBid ?? 10);
      setHighestBidderId(cached.highestBidderId ?? null);
      setSelectedOption(cached.selectedOption ?? null);
      setQuestionResults(cached.questionResults ?? []);
      if (typeof cached.isLeaderboardBroadcasted === 'boolean') {
        setIsLeaderboardBroadcasted(cached.isLeaderboardBroadcasted);
      }
      if (cached.teams && cached.teams.length > 0) {
        onUpdateTeams(cached.teams);
      }
    }
  }, []);

  // Subscribe to real-time cross-tab / cross-device updates
  useEffect(() => {
    const unsubscribe = subscribeToAuctionSync((sharedState) => {
      isBroadcastingRef.current = true;
      setCurrentQuestionIdx(sharedState.currentQuestionIdx);
      setStage(sharedState.stage);
      setBids(sharedState.bids);
      setHighestBid(sharedState.highestBid);
      setHighestBidderId(sharedState.highestBidderId);
      setSelectedOption(sharedState.selectedOption);
      setQuestionResults(sharedState.questionResults);

      if (typeof sharedState.isLeaderboardBroadcasted === 'boolean') {
        setIsLeaderboardBroadcasted(sharedState.isLeaderboardBroadcasted);
        // Non-admin devices open/close leaderboard based on admin broadcast
        if (userRole !== 'admin') {
          setIsLeaderboardOpen(sharedState.isLeaderboardBroadcasted);
        }
      }

      if (sharedState.teams) {
        onUpdateTeams(sharedState.teams);
      }

      // Play audio & announcements based on incoming actions
      if (sharedState.lastAction) {
        if (sharedState.lastAction.type === 'LOCK_BID') {
          playGavelSound();
          const winning = sharedState.teams?.find((t) => t.id === sharedState.highestBidderId);
          setLiveAnnouncement({
            message: `🔨 Hammer Down! Bid locked at ${sharedState.highestBid} coins by ${winning?.name || 'winning team'}!`,
            type: 'info'
          });
        } else if (sharedState.lastAction.type === 'EVALUATE') {
          const { isAnswerCorrect, winningBid } = sharedState.lastAction.payload;
          if (isAnswerCorrect) {
            playCorrectSound();
            setLiveAnnouncement({
              message: `🎉 CORRECT! +10 Points awarded! Coins remain at 100 for bidding!`,
              type: 'success'
            });
          } else {
            playWrongSound();
            setLiveAnnouncement({
              message: `❌ WRONG! -10 Points deducted! Lost ${winningBid} coins from bid.`,
              type: 'danger'
            });
          }
        } else if (sharedState.lastAction.type === 'PLACE_BID') {
          playCoinSound();
        } else if (sharedState.lastAction.type === 'NEXT_QUESTION') {
          playTickSound();
          setLiveAnnouncement(null);
        }
      }

      setTimeout(() => {
        isBroadcastingRef.current = false;
      }, 50);
    });

    return () => {
      unsubscribe();
    };
  }, [onUpdateTeams]);

  // Sync state broadcast helper
  const broadcastSync = (
    updatedFields: Partial<SharedAuctionState>,
    actionType?: AuctionActionType,
    actionPayload?: any
  ) => {
    const current = loadSharedAuctionState();
    const fullState: SharedAuctionState = {
      currentQuestionIdx,
      stage,
      bids,
      highestBid,
      highestBidderId,
      selectedOption,
      questionResults,
      teams,
      round2TimeLeft: current?.round2TimeLeft ?? 40 * 60,
      isRound2TimerRunning: current?.isRound2TimerRunning ?? false,
      isLeaderboardBroadcasted,
      lastUpdated: Date.now(),
      lastAction: actionType ? { type: actionType, payload: actionPayload } : undefined,
      ...updatedFields,
    };
    saveSharedAuctionState(fullState);
  };

  const currentQ = questions[currentQuestionIdx];
  const highestBidderTeam = teams.find((t) => t.id === highestBidderId);
  const activeTeam = teams.find((t) => t.id === activeTeamId);

  // Switch role handler with PIN check for Admin
  const handleRoleSwitch = (newRole: UserRole) => {
    if (newRole === 'admin' && !isAdminUnlocked) {
      setShowPinModal(true);
      return;
    }
    setUserRole(newRole);
    if (onRoleChange) onRoleChange(newRole);
  };

  const handleUnlockAdmin = () => {
    // Password required: "Arun0211"
    if (enteredPin === 'Arun0211') {
      setIsAdminUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('codeclash_admin_auth', 'Arun0211');
      }
      setUserRole('admin');
      setShowPinModal(false);
      setEnteredPin('');
      setPinError('');
      if (onRoleChange) onRoleChange('admin');
    } else {
      setPinError('Incorrect administrator password. Please try again.');
    }
  };

  const handleCancelAdminPin = () => {
    setShowPinModal(false);
    setEnteredPin('');
    setPinError('');
    if (!isAdminUnlocked && userRole === 'admin') {
      // Revert to team mode if cancelled without unlocking
      setUserRole('team');
      if (onRoleChange) onRoleChange('team');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('codeclash_admin_auth');
    }
    setUserRole('team');
    if (onRoleChange) onRoleChange('team');
  };

  const handleToggleLeaderboardBroadcast = (broadcast: boolean) => {
    if (userRole !== 'admin') return;
    setIsLeaderboardBroadcasted(broadcast);
    if (broadcast) {
      setIsLeaderboardOpen(true);
    }
    broadcastSync(
      { isLeaderboardBroadcasted: broadcast },
      'LEADERBOARD_SYNC',
      { isOpen: broadcast }
    );
  };

  // Place a bid from current active team (or selected team if admin)
  const handlePlaceBid = (amount: number, biddingTeamId?: string) => {
    const targetTeamId = biddingTeamId || (userRole === 'team' ? activeTeamId : activeTeamId);
    const team = teams.find((t) => t.id === targetTeamId);
    if (!team) return;

    if (amount > team.coins) {
      alert(`${team.name} only has ${team.coins} coins! Cannot bid ${amount} coins.`);
      return;
    }

    if (amount <= highestBid && bids.length > 0) {
      alert(`Bid must be strictly higher than current highest bid of ${highestBid} coins!`);
      return;
    }

    playCoinSound();
    const newBid: BidRecord = {
      id: Math.random().toString(),
      teamId: team.id,
      teamName: team.name,
      amount: amount,
      timestamp: Date.now(),
    };

    const updatedBids = [newBid, ...bids];
    setBids(updatedBids);
    setHighestBid(amount);
    setHighestBidderId(team.id);
    setCustomBidAmount((amount + 5).toString());

    broadcastSync(
      {
        bids: updatedBids,
        highestBid: amount,
        highestBidderId: team.id,
      },
      'PLACE_BID',
      { teamId: team.id, amount }
    );
  };

  // Hammer Down / Gavel Sold (ADMIN ONLY)
  const handleGavelHammerDown = () => {
    if (userRole !== 'admin') {
      alert('Access Restricted: Only the Event Admin can hammer down and lock winning bids!');
      return;
    }

    let winnerId = highestBidderId;
    let winningAmount = highestBid;

    if (!winnerId) {
      // Default to the first team with enough coins if no bid was placed yet
      const fallbackTeam = teams.find((t) => t.coins >= 10) || teams[0];
      winnerId = fallbackTeam.id;
      winningAmount = 10;
      setHighestBidderId(winnerId);
      setHighestBid(10);
    }

    playGavelSound();
    setStage('answering');

    const winningTeam = teams.find((t) => t.id === winnerId);
    setLiveAnnouncement({
      message: `🔨 Hammer Down! Bid locked at ${winningAmount} coins by ${winningTeam?.name || 'winning team'}!`,
      type: 'info'
    });

    broadcastSync(
      {
        stage: 'answering',
        highestBid: winningAmount,
        highestBidderId: winnerId,
      },
      'LOCK_BID',
      { winnerId, winningAmount }
    );
  };

  // Submit Answer & Evaluate Scores (+10 or -10) (ADMIN ONLY)
  const handleEvaluateAnswer = (isCorrectOverride?: boolean) => {
    if (userRole !== 'admin') {
      alert('Access Restricted: Only the Event Admin has permission to award +10 or -10 points!');
      return;
    }

    if (!highestBidderId) return;

    const chosenOption = selectedOption ?? -1;
    const isAnswerCorrect =
      isCorrectOverride !== undefined
        ? isCorrectOverride
        : chosenOption === currentQ.correctAnswerIndex;

    const pointsDelta = isAnswerCorrect ? 10 : -10;

    if (isAnswerCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    // STRICT RULES AS REQUESTED:
    // If CORRECT:
    //   - Score increases by +10 points
    //   - Coins remain at 100 for bidding! (full 100 coins preserved)
    // If WRONG:
    //   - Score decreases by -10 points
    //   - Team loses coins equal to how much they bid!
    const updated = teams.map((t) => {
      if (t.id === highestBidderId) {
        const newCoins = isAnswerCorrect
          ? Math.max(t.coins, 100) // Coins remain to 100 coins for bidding!
          : Math.max(0, t.coins - highestBid); // Lost coins how much they bid

        return {
          ...t,
          coins: newCoins,
          score: t.score + pointsDelta,
          correctCount: isAnswerCorrect ? t.correctCount + 1 : t.correctCount,
          wrongCount: !isAnswerCorrect ? t.wrongCount + 1 : t.wrongCount,
          bidsWon: t.bidsWon + 1,
        };
      }
      return t;
    });

    onUpdateTeams(updated);

    const resultRecord: AuctionQuestionResult = {
      questionId: currentQ.id,
      winningTeamId: highestBidderId,
      winningBid: highestBid,
      selectedOption: chosenOption,
      isCorrect: isAnswerCorrect,
      pointsDelta: pointsDelta,
    };

    const updatedResults = [...questionResults, resultRecord];
    setQuestionResults(updatedResults);
    setStage('revealed');

    if (isAnswerCorrect) {
      setLiveAnnouncement({
        message: `🎉 CORRECT! +10 Points awarded! Coins remain at 100 for bidding!`,
        type: 'success'
      });
    } else {
      setLiveAnnouncement({
        message: `❌ WRONG! -10 Points deducted! Lost ${highestBid} coins from bid.`,
        type: 'danger'
      });
    }

    // Broadcast update to all client systems
    broadcastSync(
      {
        stage: 'revealed',
        teams: updated,
        questionResults: updatedResults,
      },
      'EVALUATE',
      { isAnswerCorrect, winningBid: highestBid }
    );
  };

  // Direct manual score adjustment by Admin (+10 / -10)
  const handleAdminDirectScoreAdjust = (teamId: string, delta: number) => {
    if (userRole !== 'admin') return;
    playTickSound();
    const updated = teams.map((t) => {
      if (t.id === teamId) {
        return {
          ...t,
          score: t.score + delta,
          correctCount: delta > 0 ? t.correctCount + 1 : t.correctCount,
          wrongCount: delta < 0 ? t.wrongCount + 1 : t.wrongCount,
        };
      }
      return t;
    });
    onUpdateTeams(updated);
    broadcastSync({ teams: updated });
  };

  // Move to next question (ADMIN ONLY)
  const handleNextQuestion = () => {
    if (userRole !== 'admin') {
      alert('Access Restricted: Only Admin can advance to the next question!');
      return;
    }

    playTickSound();
    if (currentQuestionIdx < questions.length - 1) {
      const nextIdx = currentQuestionIdx + 1;
      setCurrentQuestionIdx(nextIdx);
      setStage('bidding');
      setBids([]);
      setHighestBid(10);
      setHighestBidderId(null);
      setSelectedOption(null);
      setCustomBidAmount('15');
      setLiveAnnouncement(null);

      broadcastSync(
        {
          currentQuestionIdx: nextIdx,
          stage: 'bidding',
          bids: [],
          highestBid: 10,
          highestBidderId: null,
          selectedOption: null,
        },
        'NEXT_QUESTION'
      );
    } else {
      onFinishEvent();
    }
  };

  // Auto-Simulate Team Bidding War (for fast demo)
  const handleSimulateBidWar = () => {
    playCoinSound();
    const availableTeams = teams.filter((t) => t.coins >= 20);
    if (availableTeams.length === 0) return;

    let base = 10;
    const simulatedBids: BidRecord[] = [];
    const shuffled = [...availableTeams].sort(() => 0.5 - Math.random());

    shuffled.slice(0, Math.min(3, shuffled.length)).forEach((team, idx) => {
      base += (idx + 1) * 5;
      const actualBid = Math.min(base, team.coins);
      simulatedBids.unshift({
        id: Math.random().toString(),
        teamId: team.id,
        teamName: team.name,
        amount: actualBid,
        timestamp: Date.now() + idx * 100,
      });
    });

    if (simulatedBids.length > 0) {
      setBids(simulatedBids);
      setHighestBid(simulatedBids[0].amount);
      setHighestBidderId(simulatedBids[0].teamId);
      setCustomBidAmount((simulatedBids[0].amount + 5).toString());

      broadcastSync(
        {
          bids: simulatedBids,
          highestBid: simulatedBids[0].amount,
          highestBidderId: simulatedBids[0].teamId,
        },
        'PLACE_BID'
      );
    }
  };

  const currentResult = questionResults.find((r) => r.questionId === currentQ.id);

  // Open separate system tab
  const handleOpenNewSystemTab = (role: UserRole, teamId?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    if (teamId) {
      url.searchParams.set('teamId', teamId);
    } else {
      url.searchParams.delete('teamId');
    }
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
      {/* MULTI-SYSTEM CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Active Terminal:
          </span>

          {/* Role Mode Pills */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <div className="flex items-center">
              <button
                id="btn-role-admin"
                type="button"
                onClick={() => handleRoleSwitch('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  userRole === 'admin'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Console</span>
                {userRole === 'admin' ? (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded font-bold">
                    Master
                  </span>
                ) : (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
              </button>
              {userRole === 'admin' && (
                <button
                  id="btn-lock-admin"
                  type="button"
                  onClick={handleLockAdmin}
                  title="Lock Admin Console & require password to re-enter"
                  className="ml-1 p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              id="btn-role-team"
              type="button"
              onClick={() => handleRoleSwitch('team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userRole === 'team'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Team Terminal</span>
            </button>

            <button
              id="btn-role-projector"
              type="button"
              onClick={() => handleRoleSwitch('projector')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userRole === 'projector'
                  ? 'bg-white text-purple-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Projector Big Screen</span>
            </button>
          </div>

          {/* Team Switcher for Team Terminal Mode */}
          {userRole === 'team' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold">Your Team:</span>
              <select
                id="select-active-team"
                value={activeTeamId}
                onChange={(e) => setActiveTeamId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white text-slate-900">
                    {t.avatar} {t.name} ({t.coins} coins, {t.score} pts)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right side: Open multi-tab helpers & Live sync badge */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-team-tab"
            type="button"
            onClick={() => handleOpenNewSystemTab('team', activeTeamId)}
            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Open a separate Team Terminal in a new browser tab/window to test real-time multi-device sync"
          >
            <ExternalLink className="w-3 h-3 text-indigo-600" />
            <span>Open Team Screen in New Window</span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-Time Synced
          </span>
        </div>
      </div>

      {/* Live Announcement Banner */}
      {liveAnnouncement && (
        <div
          className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between gap-3 shadow-xs ${
            liveAnnouncement.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : liveAnnouncement.type === 'danger'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{liveAnnouncement.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setLiveAnnouncement(null)}
            className="text-xs opacity-70 hover:opacity-100 font-mono px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner: Team Wallets & Live Scores */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Coins className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Team Vaults & Live Scores
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  100 Starting Coins
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Rule: Correct: <strong className="text-emerald-700 font-semibold">+10 pts & coins remain 100</strong> • Wrong: <strong className="text-rose-700 font-semibold">-10 pts & lose bid coins</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userRole === 'admin' ? (
              <>
                <button
                  id="btn-admin-broadcast-leaderboard"
                  type="button"
                  onClick={() => handleToggleLeaderboardBroadcast(!isLeaderboardBroadcasted)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                    isLeaderboardBroadcasted
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  title={
                    isLeaderboardBroadcasted
                      ? 'Teams are currently viewing leaderboard. Click to hide.'
                      : 'Click to broadcast leaderboard to all team screens'
                  }
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>
                    {isLeaderboardBroadcasted
                      ? 'Stop Live Broadcast'
                      : 'Broadcast Leaderboard'}
                  </span>
                </button>

                <button
                  id="btn-open-leaderboard"
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Leaderboard & Stats
                </button>
              </>
            ) : isLeaderboardBroadcasted ? (
              <button
                id="btn-open-leaderboard"
                onClick={() => setIsLeaderboardOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer animate-pulse"
              >
                <Trophy className="w-4 h-4 text-white" />
                <span>Leaderboard • Revealed by Admin</span>
              </button>
            ) : (
              <div
                title="Leaderboard is under Admin control and will be displayed when revealed by the Admin"
                className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs flex items-center gap-1.5 cursor-not-allowed select-none"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Leaderboard: Admin Controlled</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Team Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {teams.map((team) => {
            const isHighest = team.id === highestBidderId;
            const isThisClientTeam = userRole === 'team' && team.id === activeTeamId;

            return (
              <div
                key={team.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all relative ${
                  isThisClientTeam
                    ? 'ring-2 ring-indigo-500 bg-indigo-50/40 border-indigo-200 shadow-xs'
                    : isHighest
                    ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/50 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                {isThisClientTeam && (
                  <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                    Your System
                  </span>
                )}

                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xl">{team.avatar}</span>
                    <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {team.name}
                    </span>
                  </div>
                  {isHighest && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                      Top Bid
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 font-mono">
                  {/* Coins */}
                  <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans font-medium">
                      Coins
                    </span>
                    <span className="text-sm sm:text-base font-black text-amber-700 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-500" /> {team.coins}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans font-medium">
                      Score
                    </span>
                    <span
                      className={`text-sm sm:text-base font-black ${
                        team.score > 0
                          ? 'text-emerald-700'
                          : team.score < 0
                          ? 'text-rose-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {team.score > 0 ? `+${team.score}` : team.score}
                    </span>
                  </div>
                </div>

                {/* Score Tags & Admin Adjuster */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
                  <span className="text-emerald-700 font-semibold">{team.correctCount} won (+10)</span>
                  <span className="text-rose-700 font-semibold">{team.wrongCount} lost (-10)</span>
                </div>

                {/* Admin Quick Adjust Buttons */}
                {userRole === 'admin' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAdminDirectScoreAdjust(team.id, 10)}
                      title="Admin Quick Add +10 Score"
                      className="flex-1 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> 10 pts
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDirectScoreAdjust(team.id, -10)}
                      title="Admin Quick Deduct -10 Score"
                      className="flex-1 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" /> 10 pts
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Question Flow Header - Sequential Only (No orderly 10 question list) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Question Identity & Type */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase">Q</span>
              <span className="text-lg font-black text-slate-900 leading-none">{currentQuestionIdx + 1}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Question {currentQuestionIdx + 1} of {questions.length}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {currentQ.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{currentQuestionIdx < 5 ? 'Technical Code Output' : currentQuestionIdx === 9 ? 'CSE Emoji Riddle' : 'Cinematic Scene Clue'}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">{questionResults.length} Completed</span>
                <span>•</span>
                <span className="text-slate-500">{questions.length - questionResults.length} Remaining</span>
              </p>
            </div>
          </div>

          {/* Stage Status & Sequential Navigation */}
          <div className="flex items-center gap-3">
            {/* Current Question Status Badge */}
            <div className="text-xs font-mono font-bold">
              {stage === 'bidding' && (
                <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <Gavel className="w-4 h-4 text-amber-600" /> Bidding Active
                </span>
              )}
              {stage === 'answering' && (
                <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" /> Answering: {highestBidderTeam?.name || 'Locked Team'}
                </span>
              )}
              {stage === 'revealed' && currentResult && (
                <span
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                    currentResult.isCorrect
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {currentResult.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                  <span>Q{currentQuestionIdx + 1} Finished • {currentResult.isCorrect ? '+10 Pts' : '-10 Pts'}</span>
                </span>
              )}
            </div>

            {/* Advance to next question ONLY when current question is finished */}
            {stage === 'revealed' ? (
              userRole === 'admin' ? (
                <button
                  id="btn-top-next-question"
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {currentQuestionIdx < questions.length - 1 ? (
                    <>
                      <span>Next Question • Q{currentQuestionIdx + 2}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Grand Victory Podium</span>
                      <Trophy className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
                  Waiting for Admin to launch Q{currentQuestionIdx + 2}...
                </span>
              )
            ) : (
              <span className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Finish Q{currentQuestionIdx + 1} to unlock next question</span>
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar (0% to 100%) */}
        <div className="mt-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
              style={{
                width: `${Math.round(((currentQuestionIdx + (stage === 'revealed' ? 1 : 0)) / questions.length) * 100)}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Stage Grid: Question Display & Live Auction Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Details & Presentation (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
            {/* Question Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                  Question {currentQuestionIdx + 1} of {questions.length}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  {currentQ.badge}
                </span>
              </div>

              {/* Status Pill */}
              <div className="text-xs font-bold font-mono">
                {stage === 'bidding' && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                    <Gavel className="w-3.5 h-3.5 text-amber-600" /> Bidding Active
                  </span>
                )}
                {stage === 'answering' && (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600" /> Awaiting Answer
                  </span>
                )}
                {stage === 'revealed' && currentResult && (
                  <span
                    className={`px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                      currentResult.isCorrect
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {currentResult.isCorrect ? '+10 Pts Awarded' : '-10 Pts Deducted'}
                  </span>
                )}
              </div>
            </div>

            {/* Question Title & Prompt */}
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              {currentQ.title}
            </h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              {currentQ.prompt}
            </p>

            {/* CASE 1: Code Output / Correction Question */}
            {currentQ.codeSnippet && (
              <div className="mb-6 rounded-xl bg-slate-900 p-4 border border-slate-800 shadow-inner overflow-x-auto text-slate-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  <span>Language: {currentQ.language?.toUpperCase() || 'CODE'}</span>
                  <span>Syntax Checked</span>
                </div>
                <pre className="font-mono text-xs sm:text-sm text-emerald-300 leading-relaxed">
                  {currentQ.codeSnippet}
                </pre>
              </div>
            )}

            {/* CASE 2: Cinematic Movie Scene Image Puzzle */}
            {currentQ.imageSrc && (
              <div className="mb-6 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-xs">
                <img
                  src={currentQ.imageSrc}
                  alt={currentQ.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-64 sm:h-80 object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <button
                  id="btn-zoom-image"
                  onClick={() => setZoomedImage(currentQ.imageSrc || null)}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Full Resolution
                </button>
              </div>
            )}

            {/* CASE 3: Emoji Riddle */}
            {currentQ.emojis && (
              <div className="mb-6 p-6 rounded-xl bg-purple-50/60 border border-purple-200/80 text-center shadow-2xs">
                <div className="text-4xl sm:text-5xl tracking-widest mb-3 select-none">
                  {currentQ.emojis.join('  ')}
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-xs font-bold text-purple-800">
                  Decipher the Computer Science Concept
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3">
              {stage === 'answering' && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3 ${
                  userRole === 'admin'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-2">
                    {userRole === 'admin' ? (
                      <>
                        <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold">
                          Admin Master Access: Click option below to choose {highestBidderTeam?.name || 'team'}&apos;s answer
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Only Admin has access to choose the team&apos;s answer.</span>
                      </>
                    )}
                  </div>
                  {selectedOption !== null && (
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      Selected: Option {String.fromCharCode(65 + selectedOption)}
                    </span>
                  )}
                </div>
              )}

              {currentQ.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctAnswerIndex;

                let btnStyle = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800';
                if (stage === 'revealed') {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-50 border-rose-400 text-rose-900 font-bold';
                  } else {
                    btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold ring-1 ring-indigo-400';
                }

                return (
                  <button
                    key={idx}
                    id={`btn-round2-opt-${idx}`}
                    disabled={stage === 'revealed' || userRole !== 'admin'}
                    onClick={() => {
                      playTickSound();
                      setSelectedOption(idx);
                      broadcastSync({ selectedOption: idx });
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${btnStyle} ${
                      userRole !== 'admin' && stage !== 'revealed' ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        stage === 'revealed' && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : stage === 'revealed' && isSelected && !isCorrect
                          ? 'bg-rose-600 text-white'
                          : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-sm font-medium leading-relaxed">{opt}</span>
                    {stage === 'revealed' && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />
                    )}
                    {stage === 'revealed' && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation & Fun Fact (Revealed Stage) */}
            {stage === 'revealed' && (
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block mb-1 font-sans text-sm font-bold">
                    Detailed Explanation:
                  </strong>
                  <p className="whitespace-pre-line">{currentQ.explanation}</p>
                </div>

                {currentQ.funFact && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-900">CSE Club Trivia: </strong>
                      {currentQ.funFact}
                    </div>
                  </div>
                )}

                {userRole === 'admin' ? (
                  <div className="pt-2 flex justify-end">
                    <button
                      id="btn-next-auction-question"
                      onClick={handleNextQuestion}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {currentQuestionIdx < questions.length - 1 ? (
                        <>
                          Next Question • Q{currentQuestionIdx + 2} <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          View Victory Podium <Trophy className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-slate-500 italic">
                    Waiting for Admin to advance to the next question...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Auction Console & Hammer Podium (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Auction Podium Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-indigo-600" />
                <h4 className="font-extrabold text-slate-900 text-base">Auction Bidding War</h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Starting: 10 Coins
              </span>
            </div>

            {/* Current Top Bid Showcase */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                Current Winning Bid
              </span>
              <div className="text-4xl sm:text-5xl font-black font-mono text-amber-700 flex items-center justify-center gap-2 py-1">
                <Coins className="w-7 h-7 text-amber-500" />
                <span>{highestBid}</span>
                <span className="text-sm text-slate-600 font-sans font-normal">Coins</span>
              </div>

              {highestBidderTeam ? (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
                  <span>{highestBidderTeam.avatar}</span>
                  <span>Held by {highestBidderTeam.name}</span>
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500 italic">
                  Awaiting first bid from any team...
                </div>
              )}
            </div>

            {/* PHASE 1: Bidding Controls */}
            {stage === 'bidding' && (
              <div className="space-y-4">
                {/* Mode Context Notice */}
                {userRole === 'team' && activeTeam && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                    <span>
                      Bidding as: <strong className="text-slate-900">{activeTeam.avatar} {activeTeam.name}</strong>
                    </span>
                    <span className="font-mono text-amber-700 font-bold">
                      {activeTeam.coins} Coins Left
                    </span>
                  </div>
                )}

                {/* Select Bidding Team (for Admin or shared simulator) */}
                {userRole === 'admin' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Bidding Team (Admin Simulation / Floor Desk):
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {teams.map((t) => {
                        const isSelected = t.id === activeTeamId;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            id={`btn-select-team-${t.id}`}
                            onClick={() => {
                              playTickSound();
                              setActiveTeamId(t.id);
                            }}
                            className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <span>{t.avatar}</span>
                              <span className="truncate">{t.name}</span>
                            </span>
                            <span className="font-mono text-[10px] shrink-0 font-normal">
                              {t.coins} Coins
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Bid Increments */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Place Bid for {userRole === 'team' ? activeTeam?.name : 'Selected Team'}:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id="btn-quick-bid-5"
                      type="button"
                      onClick={() => handlePlaceBid(highestBid + 5)}
                      className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      +{5} • {highestBid + 5}c
                    </button>
                    <button
                      id="btn-quick-bid-10"
                      type="button"
                      onClick={() => handlePlaceBid(highestBid + 10)}
                      className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      +{10} • {highestBid + 10}c
                    </button>
                    <button
                      id="btn-quick-bid-20"
                      type="button"
                      onClick={() => handlePlaceBid(highestBid + 20)}
                      className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      +{20} • {highestBid + 20}c
                    </button>
                  </div>
                </div>

                {/* Custom Bid Input */}
                <div className="flex gap-2">
                  <input
                    id="input-custom-bid"
                    type="number"
                    min={highestBid + 1}
                    value={customBidAmount}
                    onChange={(e) => setCustomBidAmount(e.target.value)}
                    placeholder="Coins"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  <button
                    id="btn-custom-bid"
                    type="button"
                    onClick={() => {
                      const parsed = parseInt(customBidAmount, 10);
                      if (!isNaN(parsed)) handlePlaceBid(parsed);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs border border-slate-800 shrink-0 shadow-2xs cursor-pointer"
                  >
                    Place Custom Bid
                  </button>
                </div>

                {/* Auto Simulation for Demo */}
                {userRole === 'admin' && (
                  <button
                    id="btn-simulate-bid"
                    type="button"
                    onClick={handleSimulateBidWar}
                    className="w-full py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-500" /> Auto-Simulate Bidding War
                  </button>
                )}

                {/* Admin Select Team to Lock */}
                {userRole === 'admin' && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Lock Winning Team:</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {highestBidderTeam ? highestBidderTeam.name : 'Choose below'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {teams.map((t) => {
                        const isLockedTarget = (highestBidderId || activeTeamId) === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              playTickSound();
                              setHighestBidderId(t.id);
                              setActiveTeamId(t.id);
                              broadcastSync({ highestBidderId: t.id });
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                              isLockedTarget
                                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span>{t.avatar}</span>
                              <span className="truncate">{t.name}</span>
                            </span>
                            <span className="font-mono text-[10px] shrink-0 font-normal">
                              {t.coins} Coins
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Gavel Hammer Button (ADMIN ONLY CONTROL) */}
                <div className="pt-2">
                  {userRole === 'admin' ? (
                    <button
                      id="btn-gavel-hammer-down"
                      type="button"
                      onClick={handleGavelHammerDown}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Gavel className="w-5 h-5 text-white" />
                      <span>HAMMER DOWN: LOCK WINNING BID</span>
                    </button>
                  ) : (
                    <div className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Hammer Down: Admin Only Control</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Only the Event Admin has access to choose the answer and lock the winning team.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PHASE 2: Answering Phase Controls */}
            {stage === 'answering' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                  <strong className="text-indigo-950 block mb-1">
                    Turn to Answer: {highestBidderTeam?.name}
                  </strong>
                  Has committed <strong className="text-amber-800">{highestBid} Coins</strong>.
                  {userRole === 'admin'
                    ? ' Admin: select +10 or -10 below to evaluate.'
                    : ' Awaiting Quiz Master to award marks...'}
                </div>

                {/* ADMIN SCORING CONTROLS (+10 or -10) */}
                {userRole === 'admin' ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-indigo-600" /> Admin Score Assignment:
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        id="btn-evaluate-correct"
                        type="button"
                        onClick={() => handleEvaluateAnswer(true)}
                        className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex flex-col items-center justify-center gap-1 transition-transform cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Correct Answer
                        </span>
                        <span className="text-[11px] font-mono font-bold">+10 POINTS</span>
                        <span className="text-[9px] font-sans font-semibold text-emerald-100 bg-emerald-700/50 px-1.5 py-0.5 rounded">
                          Coins Remain 100
                        </span>
                      </button>

                      <button
                        id="btn-evaluate-wrong"
                        type="button"
                        onClick={() => handleEvaluateAnswer(false)}
                        className="py-3 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs flex flex-col items-center justify-center gap-1 transition-transform cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Wrong Answer
                        </span>
                        <span className="text-[11px] font-mono font-bold">-10 POINTS</span>
                        <span className="text-[9px] font-sans font-semibold text-rose-100 bg-rose-700/50 px-1.5 py-0.5 rounded">
                          Lose {highestBid} Coins
                        </span>
                      </button>
                    </div>

                    {selectedOption !== null && (
                      <button
                        id="btn-submit-chosen-option"
                        type="button"
                        onClick={() => handleEvaluateAnswer()}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Grade Selected Option {String.fromCharCode(65 + selectedOption)} automatically
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        playTickSound();
                        setStage('bidding');
                        broadcastSync({ stage: 'bidding' });
                      }}
                      className="w-full py-1 text-[11px] text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-open Bidding
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Admin Grading In Progress</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Only the Event Admin can give <strong className="text-emerald-700">+10</strong> or <strong className="text-rose-700">-10</strong> to the bidding team. Scores will automatically update across all terminals!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PHASE 3: Outcome Banner */}
            {stage === 'revealed' && currentResult && (
              <div
                className={`p-4 rounded-2xl border text-center space-y-2 ${
                  currentResult.isCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="text-xl sm:text-2xl font-black font-mono">
                  {currentResult.isCorrect ? '+10 POINTS AWARDED' : '-10 POINTS DEDUCTED'}
                </div>
                <div className="text-xs font-bold">
                  {currentResult.isCorrect ? 'Correct Response!' : 'Incorrect Response!'}
                </div>
                <div className="text-xs text-slate-600">
                  {currentResult.isCorrect ? (
                    <span className="text-emerald-700 font-semibold">
                      {highestBidderTeam?.name} earned +10 points! Coins remain at 100 for future bids.
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold">
                      {highestBidderTeam?.name} lost -10 points and forfeited {currentResult.winningBid} coins from their bid!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Live Bidding Feed */}
            {bids.length > 0 && (
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Question Bid Log
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {bids.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <span className="text-slate-800 font-semibold">{b.teamName}</span>
                      <span className="text-amber-700 font-mono font-bold flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-500" /> {b.amount} Coins
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Passcode Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Key className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-slate-900">Admin Console Authentication</h3>
            </div>
            <p className="text-xs text-slate-600">
              Auction master controls, timer controls, grading, hammer lock, and leaderboard broadcast require the Admin Password.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Admin Password
              </label>
              <input
                id="input-admin-password"
                type="password"
                placeholder="Enter password"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUnlockAdmin();
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none font-mono"
                autoFocus
              />
              {pinError && <p className="text-xs text-rose-600 font-semibold mt-1.5">{pinError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                id="btn-cancel-admin-auth"
                onClick={handleCancelAdminPin}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel / Team Mode
              </button>
              <button
                type="button"
                id="btn-submit-admin-pin"
                onClick={handleUnlockAdmin}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Unlock Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        teams={teams}
        questionResults={questionResults}
        questions={questions}
        userRole={userRole}
        isBroadcasted={isLeaderboardBroadcasted}
        onToggleBroadcast={userRole === 'admin' ? handleToggleLeaderboardBroadcast : undefined}
      />

      {/* Cinematic Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <img
              src={zoomedImage}
              alt="Cinematic Clue"
              referrerPolicy="no-referrer"
              className="w-full rounded-2xl border border-amber-500/50 shadow-2xl max-h-[85vh] object-contain mx-auto"
            />
            <p className="text-center text-xs text-amber-300 font-medium mt-3">
              Click anywhere to close full cinematic view
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
