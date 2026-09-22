import { AppRound, ParticipantInfo, Round1ResultData, Team, CompetitionSessionStatus } from '../types';

const STORAGE_KEYS = {
  CURRENT_ROUND: 'codeclash_current_round',
  PARTICIPANT: 'codeclash_participant',
  R1_ANSWERS: 'codeclash_r1_answers',
  R1_CURRENT_INDEX: 'codeclash_r1_current_index',
  R1_RESULT: 'codeclash_r1_result',
  R1_TIME_SPENT: 'codeclash_r1_time_spent',
  R1_START_TIME: 'codeclash_r1_start_time',
  R1_END_TIME: 'codeclash_r1_end_time',
  R1_STATUS: 'codeclash_r1_status',
  R1_MARKED_REVIEW: 'codeclash_r1_marked_review',
  R2_TEAMS: 'codeclash_r2_teams',
  R2_CURRENT_INDEX: 'codeclash_r2_current_index',
};

export const persistence = {
  saveCurrentRound(round: AppRound): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_ROUND, round);
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadCurrentRound(): AppRound | null {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUND);
      if (
        val &&
        [
          'registration',
          'round1_mcq',
          'round1_result',
          'round2_intro',
          'round2_auction',
          'final_podium',
        ].includes(val)
      ) {
        return val as AppRound;
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return null;
  },

  saveParticipant(info: ParticipantInfo): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PARTICIPANT, JSON.stringify(info));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadParticipant(): ParticipantInfo | null {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.PARTICIPANT);
      if (val) {
        return JSON.parse(val);
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return null;
  },

  saveRound1Answers(answers: Record<number, number | null>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R1_ANSWERS, JSON.stringify(answers));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadRound1Answers(): Record<number, number | null> | null {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.R1_ANSWERS);
      if (val) {
        return JSON.parse(val);
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return null;
  },

  saveRound1CurrentIndex(index: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R1_CURRENT_INDEX, index.toString());
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadRound1CurrentIndex(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.R1_CURRENT_INDEX);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return 0;
  },

  saveRound1TimeSpent(secs: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R1_TIME_SPENT, secs.toString());
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadRound1TimeSpent(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.R1_TIME_SPENT);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return 0;
  },

  // Stored Start and End Timestamps for strict 25-minute countdown
  saveRound1Timestamps(startTime: number, endTime: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R1_START_TIME, startTime.toString());
      localStorage.setItem(STORAGE_KEYS.R1_END_TIME, endTime.toString());
    } catch (e) {
      console.warn('Storage timestamp save error:', e);
    }
  },

  loadRound1Timestamps(): { startTime: number; endTime: number } | null {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.R1_START_TIME);
      const e = localStorage.getItem(STORAGE_KEYS.R1_END_TIME);
      if (s && e) {
        const start = parseInt(s, 10);
        const end = parseInt(e, 10);
        if (!isNaN(start) && !isNaN(end) && end > start) {
          return { startTime: start, endTime: end };
        }
      }
    } catch (err) {
      console.warn('Storage timestamp load error:', err);
    }
    return null;
  },

  saveRound1Status(status: CompetitionSessionStatus): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R1_STATUS, status);
    } catch (e) {
      console.warn('Storage status save error:', e);
    }
  },

  loadRound1Status(): CompetitionSessionStatus | null {
    try {
      return (localStorage.getItem(STORAGE_KEYS.R1_STATUS) as CompetitionSessionStatus) || null;
    } catch {
      return null;
    }
  },

  saveRound1Marked(marked: Record<number, boolean>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R1_MARKED_REVIEW, JSON.stringify(marked));
    } catch (e) {
      console.warn('Storage marked save error:', e);
    }
  },

  loadRound1Marked(): Record<number, boolean> | null {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.R1_MARKED_REVIEW);
      if (val) return JSON.parse(val);
    } catch {
      return null;
    }
    return null;
  },

  saveRound1Result(result: Round1ResultData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R1_RESULT, JSON.stringify(result));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadRound1Result(): Round1ResultData | null {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.R1_RESULT);
      if (val) {
        return JSON.parse(val);
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return null;
  },

  saveTeams(teams: Team[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R2_TEAMS, JSON.stringify(teams));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadTeams(): Team[] | null {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.R2_TEAMS);
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return null;
  },

  saveRound2CurrentIndex(index: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.R2_CURRENT_INDEX, index.toString());
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  loadRound2CurrentIndex(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.R2_CURRENT_INDEX);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
    return 0;
  },

  clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  },
};
