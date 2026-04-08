import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';
import {
  PollRestaurant,
  PollVoter,
  PollSuggestion,
  PollAttendee,
  DailyPollData,
  PollHistoryEntry,
} from '../types/group';

export type { PollRestaurant, PollVoter, PollSuggestion, PollAttendee, DailyPollData, PollHistoryEntry };

export function usePoll(groupId: number | null) {
  const [poll, setPoll] = useState<DailyPollData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchPoll = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/groups/${groupId}/poll/today`);
      if (res.ok) {
        setPoll(await res.json());
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchPoll();
    intervalRef.current = setInterval(fetchPoll, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchPoll]);

  const suggest = useCallback(async (naverPlaceId: string) => {
    if (!groupId) return false;
    try {
      const res = await apiFetch(`/api/groups/${groupId}/poll/today/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naverPlaceId }),
      });
      if (res.ok) {
        await fetchPoll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [groupId, fetchPoll]);

  const vote = useCallback(async (suggestionId: number) => {
    if (!groupId) return;
    try {
      await apiFetch(`/api/groups/${groupId}/poll/today/vote/${suggestionId}`, { method: 'POST' });
      await fetchPoll();
    } catch {
      // silent
    }
  }, [groupId, fetchPoll]);

  const unvote = useCallback(async (suggestionId: number) => {
    if (!groupId) return;
    try {
      await apiFetch(`/api/groups/${groupId}/poll/today/vote/${suggestionId}`, { method: 'DELETE' });
      await fetchPoll();
    } catch {
      // silent
    }
  }, [groupId, fetchPoll]);

  const toggleJoin = useCallback(async () => {
    if (!groupId) return;
    try {
      await apiFetch(`/api/groups/${groupId}/poll/today/join`, { method: 'POST' });
      await fetchPoll();
    } catch {
      // silent
    }
  }, [groupId, fetchPoll]);

  const finalize = useCallback(async (winnerId?: number) => {
    if (!groupId) return false;
    try {
      const res = await apiFetch(`/api/groups/${groupId}/poll/today/finalize`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(winnerId ? { winnerId } : {}),
      });
      if (res.ok) {
        await fetchPoll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [groupId, fetchPoll]);

  const fetchHistory = useCallback(async (days: number = 7): Promise<PollHistoryEntry[]> => {
    if (!groupId) return [];
    try {
      const res = await apiFetch(`/api/groups/${groupId}/poll/history?days=${days}`);
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  }, [groupId]);

  return {
    poll,
    isLoading,
    fetchPoll,
    suggest,
    vote,
    unvote,
    toggleJoin,
    finalize,
    fetchHistory,
  };
}
