import React, { useState, useCallback } from 'react';
import { useGroups, LunchGroup } from '../../hooks/useGroups';
import { GroupList } from './GroupList';
import { GroupDetail } from './GroupDetail';
import './GroupTab.scss';

interface GroupTabProps {
  isLoggedIn: boolean;
  onLogin: (provider: 'google' | 'naver' | 'github') => void;
}

export function GroupTab({ isLoggedIn, onLogin }: GroupTabProps) {
  const groupsHook = useGroups(isLoggedIn);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const handleSelectGroup = useCallback((group: LunchGroup) => {
    setSelectedGroupId(group.id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedGroupId(null);
    groupsHook.fetchGroups();
  }, [groupsHook]);

  if (!isLoggedIn) {
    return (
      <div className="group-tab__login-prompt">
        <div className="group-tab__login-icon">&#128101;</div>
        <h3>로그인이 필요합니다</h3>
        <p>그룹 기능을 사용하려면 로그인해주세요.</p>
        <div className="group-tab__login-buttons">
          <button className="group-tab__login-btn group-tab__login-btn--google" onClick={() => onLogin('google')}>
            Google로 로그인
          </button>
          <button className="group-tab__login-btn group-tab__login-btn--github" onClick={() => onLogin('github')}>
            GitHub로 로그인
          </button>
        </div>
      </div>
    );
  }

  if (selectedGroupId) {
    return (
      <GroupDetail
        groupId={selectedGroupId}
        groupsHook={groupsHook}
        onBack={handleBack}
      />
    );
  }

  return (
    <GroupList
      groupsHook={groupsHook}
      onSelectGroup={handleSelectGroup}
    />
  );
}
