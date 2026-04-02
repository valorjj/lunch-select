import React, { useState, useEffect, useCallback } from 'react';
import { useGroups, LunchGroup, GroupMember } from '../../hooks/useGroups';
import { usePoll } from '../../hooks/usePoll';
import { DailyPoll } from './DailyPoll';

interface GroupDetailProps {
  groupId: number;
  groupsHook: ReturnType<typeof useGroups>;
  onBack: () => void;
}

export function GroupDetail({ groupId, groupsHook, onBack }: GroupDetailProps) {
  const { fetchGroupDetail, leaveGroup, deleteGroup, kickMember } = groupsHook;
  const [group, setGroup] = useState<LunchGroup | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pollHook = usePoll(groupId);

  const loadDetail = useCallback(async () => {
    const detail = await fetchGroupDetail(groupId);
    if (detail) setGroup(detail);
  }, [groupId, fetchGroupDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleCopyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (await leaveGroup(groupId)) {
      onBack();
    }
  };

  const handleDelete = async () => {
    if (await deleteGroup(groupId)) {
      onBack();
    }
  };

  const handleKick = async (userId: number) => {
    if (await kickMember(groupId, userId)) {
      loadDetail();
    }
  };

  if (!group) {
    return <div className="group-detail__loading">불러오는 중...</div>;
  }

  return (
    <div className="group-detail">
      <button className="group-detail__back" onClick={onBack}>&#8592; 그룹 목록</button>

      <div className="group-detail__header">
        <h3 className="group-detail__name">{group.name}</h3>
        <div className="group-detail__invite">
          <span className="group-detail__invite-label">초대 코드</span>
          <button className="group-detail__invite-code" onClick={handleCopyCode}>
            {group.inviteCode}
            <span className="group-detail__copy-hint">{copied ? '복사됨!' : '복사'}</span>
          </button>
        </div>
      </div>

      <div className="group-detail__members-toggle">
        <button
          className="group-detail__members-btn"
          onClick={() => setShowMembers(!showMembers)}
        >
          멤버 ({group.members?.length || 0}명) {showMembers ? '▲' : '▼'}
        </button>
      </div>

      {showMembers && group.members && (
        <ul className="group-detail__members">
          {group.members.map(member => (
            <li key={member.id} className="group-detail__member">
              <div className="group-detail__member-info">
                {member.profileImage ? (
                  <img className="group-detail__member-avatar" src={member.profileImage} alt={member.name} />
                ) : (
                  <span className="group-detail__member-avatar-placeholder">{member.name.charAt(0)}</span>
                )}
                <span className="group-detail__member-name">{member.name}</span>
                {member.role === 'owner' && <span className="group-detail__member-badge">그룹장</span>}
              </div>
              {group.isOwner && member.role !== 'owner' && (
                <button className="group-detail__kick-btn" onClick={() => handleKick(member.id)}>내보내기</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <DailyPoll pollHook={pollHook} />

      <div className="group-detail__footer">
        {group.isOwner ? (
          confirmDelete ? (
            <div className="group-detail__confirm">
              <span>정말 삭제하시겠습니까?</span>
              <button className="group-detail__confirm-btn group-detail__confirm-btn--danger" onClick={handleDelete}>삭제</button>
              <button className="group-detail__confirm-btn" onClick={() => setConfirmDelete(false)}>취소</button>
            </div>
          ) : (
            <button className="group-detail__danger-btn" onClick={() => setConfirmDelete(true)}>그룹 삭제</button>
          )
        ) : (
          <button className="group-detail__danger-btn" onClick={handleLeave}>그룹 나가기</button>
        )}
      </div>
    </div>
  );
}
