export interface GroupMember {
  id: number;
  name: string;
  profileImage: string | null;
  role: 'owner' | 'member';
}

export interface LunchGroup {
  id: number;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  createdAt: string;
  members?: GroupMember[];
}

export interface PollRestaurant {
  naverPlaceId: string;
  name: string;
  category: string;
  thumbnail: string;
  roadAddress: string;
  lat: number;
  lng: number;
}

export interface PollVoter {
  id: number;
  name: string;
}

export interface PollSuggestion {
  id: number;
  restaurant: PollRestaurant;
  suggestedBy: PollVoter;
  voteCount: number;
  myVote: boolean;
  voters: PollVoter[];
}

export interface PollAttendee {
  id: number;
  name: string;
  profileImage: string | null;
}

export interface DailyPollData {
  pollId: number;
  date: string;
  status: string;
  suggestions: PollSuggestion[];
  attendance: PollAttendee[];
  amJoining: boolean;
  winner: PollRestaurant | null;
}

export interface PollHistoryEntry {
  date: string;
  restaurant: {
    naverPlaceId: string;
    name: string;
    category: string;
  };
}
