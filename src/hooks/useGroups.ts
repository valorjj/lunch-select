import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { GroupMember, LunchGroup } from '../types/group';

export type { GroupMember, LunchGroup };

export function useGroups(isLoggedIn: boolean) {
  const [groups, setGroups] = useState<LunchGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/groups');
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch {
      setError('그룹 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const fetchGroupDetail = useCallback(async (groupId: number): Promise<LunchGroup | null> => {
    try {
      const res = await apiFetch(`/api/groups/${groupId}`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }, []);

  const createGroup = useCallback(async (name: string): Promise<LunchGroup | null> => {
    setError(null);
    try {
      const res = await apiFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const group = await res.json();
        await fetchGroups();
        return group;
      }
      const err = await res.json();
      setError(err.error || '그룹 생성에 실패했습니다.');
      return null;
    } catch {
      setError('그룹 생성에 실패했습니다.');
      return null;
    }
  }, [fetchGroups]);

  const joinGroup = useCallback(async (inviteCode: string): Promise<LunchGroup | null> => {
    setError(null);
    try {
      const res = await apiFetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchGroups();
        return data;
      }
      setError(data.error || '그룹 참여에 실패했습니다.');
      return null;
    } catch {
      setError('그룹 참여에 실패했습니다.');
      return null;
    }
  }, [fetchGroups]);

  const leaveGroup = useCallback(async (groupId: number) => {
    try {
      const res = await apiFetch(`/api/groups/${groupId}/leave`, { method: 'DELETE' });
      if (res.ok) {
        await fetchGroups();
        return true;
      }
      const data = await res.json();
      setError(data.error);
      return false;
    } catch {
      return false;
    }
  }, [fetchGroups]);

  const deleteGroup = useCallback(async (groupId: number) => {
    try {
      const res = await apiFetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchGroups();
        return true;
      }
      const data = await res.json();
      setError(data.error);
      return false;
    } catch {
      return false;
    }
  }, [fetchGroups]);

  const kickMember = useCallback(async (groupId: number, userId: number) => {
    try {
      const res = await apiFetch(`/api/groups/${groupId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    fetchGroupDetail,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    kickMember,
  };
}
