import React, { useState } from 'react';
import { useGroups, LunchGroup } from '../../hooks/useGroups';
import './GroupList.scss';

interface GroupListProps {
  groupsHook: ReturnType<typeof useGroups>;
  onSelectGroup: (group: LunchGroup) => void;
}

export function GroupList({ groupsHook, onSelectGroup }: GroupListProps) {
  const { groups, isLoading, error, createGroup, joinGroup } = groupsHook;
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setActionLoading(true);
    const group = await createGroup(newName.trim());
    setActionLoading(false);
    if (group) {
      setNewName('');
      setShowCreate(false);
      onSelectGroup(group);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setActionLoading(true);
    const group = await joinGroup(inviteCode.trim().toUpperCase());
    setActionLoading(false);
    if (group) {
      setInviteCode('');
      setShowJoin(false);
      onSelectGroup(group);
    }
  };

  return (
    <div className="group-list">
      <div className="group-list__actions">
        <button className="group-list__action-btn" onClick={() => { setShowCreate(true); setShowJoin(false); }}>
          + 그룹 만들기
        </button>
        <button className="group-list__action-btn group-list__action-btn--secondary" onClick={() => { setShowJoin(true); setShowCreate(false); }}>
          초대 코드로 참여
        </button>
      </div>

      {showCreate && (
        <div className="group-list__form">
          <input
            className="group-list__input"
            type="text"
            placeholder="그룹 이름 (예: 개발팀 점심)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            maxLength={50}
            autoFocus
          />
          <div className="group-list__form-actions">
            <button className="group-list__form-btn" onClick={handleCreate} disabled={actionLoading || !newName.trim()}>
              {actionLoading ? '생성 중...' : '만들기'}
            </button>
            <button className="group-list__form-btn group-list__form-btn--cancel" onClick={() => setShowCreate(false)}>
              취소
            </button>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="group-list__form">
          <input
            className="group-list__input"
            type="text"
            placeholder="초대 코드 입력 (8자리)"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={8}
            autoFocus
          />
          <div className="group-list__form-actions">
            <button className="group-list__form-btn" onClick={handleJoin} disabled={actionLoading || !inviteCode.trim()}>
              {actionLoading ? '참여 중...' : '참여하기'}
            </button>
            <button className="group-list__form-btn group-list__form-btn--cancel" onClick={() => setShowJoin(false)}>
              취소
            </button>
          </div>
        </div>
      )}

      {error && <p className="group-list__error">{error}</p>}

      {isLoading && <div className="group-list__loading">불러오는 중...</div>}

      {!isLoading && groups.length === 0 && (
        <div className="group-list__empty">
          <div className="group-list__empty-icon">&#128101;</div>
          <p>아직 참여한 그룹이 없어요.</p>
          <p className="group-list__empty-hint">그룹을 만들거나 초대 코드로 참여해보세요!</p>
        </div>
      )}

      {groups.length > 0 && (
        <ul className="group-list__items">
          {groups.map(group => (
            <li key={group.id} className="group-list__item" onClick={() => onSelectGroup(group)}>
              <div className="group-list__item-info">
                <span className="group-list__item-name">{group.name}</span>
                {group.isOwner && <span className="group-list__item-badge">그룹장</span>}
              </div>
              <span className="group-list__item-arrow">&#8250;</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
