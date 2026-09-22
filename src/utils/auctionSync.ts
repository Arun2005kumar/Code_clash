/**
 * Real-time state synchronization for CODE CLASH Round 2
 * Uses BroadcastChannel and localStorage events for instant cross-tab / cross-window sync
 * between Admin System, Team Client Systems, and Projector Display.
 */

import { Team, BidRecord, AuctionQuestionResult } from '../types';

export type AuctionActionType = 'LOCK_BID' | 'EVALUATE' | 'PLACE_BID' | 'NEXT_QUESTION' | 'TIMER_SYNC' | 'LEADERBOARD_SYNC' | 'RESET';

export interface SharedAuctionState {
  currentQuestionIdx: number;
  stage: 'bidding' | 'answering' | 'revealed';
  bids: BidRecord[];
  highestBid: number;
  highestBidderId: string | null;
  selectedOption: number | null;
  questionResults: AuctionQuestionResult[];
  teams: Team[];
  round2TimeLeft: number;
  isRound2TimerRunning: boolean;
  isLeaderboardBroadcasted?: boolean;
  lastUpdated: number;
  lastAction?: {
    type: AuctionActionType;
    payload?: any;
  };
}

const STORAGE_KEY = 'code_clash_round2_shared_state';
const CHANNEL_NAME = 'code_clash_round2_sync_channel';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

export function saveSharedAuctionState(state: SharedAuctionState) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, payload);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_UPDATE', state });
    }
  } catch (err) {
    console.error('Failed to save shared auction state:', err);
  }
}

export function loadSharedAuctionState(): SharedAuctionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to load shared auction state:', err);
  }
  return null;
}

export function subscribeToAuctionSync(
  onStateUpdate: (state: SharedAuctionState) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'STATE_UPDATE' && event.data.state) {
      onStateUpdate(event.data.state);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        onStateUpdate(parsed);
      } catch (e) {
        console.error('Failed parsing storage update', e);
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export function broadcastTimerSync(timeLeft: number, isRunning: boolean) {
  const current = loadSharedAuctionState();
  if (current) {
    current.round2TimeLeft = timeLeft;
    current.isRound2TimerRunning = isRunning;
    current.lastUpdated = Date.now();
    current.lastAction = { type: 'TIMER_SYNC', payload: { timeLeft, isRunning } };
    saveSharedAuctionState(current);
  } else {
    // If not yet created, create minimal state
    const initialState: SharedAuctionState = {
      currentQuestionIdx: 0,
      stage: 'bidding',
      bids: [],
      highestBid: 10,
      highestBidderId: null,
      selectedOption: null,
      questionResults: [],
      teams: [],
      round2TimeLeft: timeLeft,
      isRound2TimerRunning: isRunning,
      lastUpdated: Date.now(),
      lastAction: { type: 'TIMER_SYNC', payload: { timeLeft, isRunning } }
    };
    saveSharedAuctionState(initialState);
  }
}

export function broadcastLeaderboardSync(isOpen: boolean) {
  const current = loadSharedAuctionState();
  if (current) {
    current.isLeaderboardBroadcasted = isOpen;
    current.lastUpdated = Date.now();
    current.lastAction = { type: 'LEADERBOARD_SYNC', payload: { isOpen } };
    saveSharedAuctionState(current);
  }
}
