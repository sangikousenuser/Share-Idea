// フロントエンド用型定義

export interface OpinionDTO {
    id: string;
    text: string;
    imageUrl?: string;
    x: number;
    y: number;
    votes: number;
    reactions: { [emoji: string]: number };
    creatorId: string;
    createdAt: number;
}

export type WSMessage =
    | { type: 'join'; roomId: string; clientId: string }
    | { type: 'create'; clientId: string }
    | { type: 'sync'; opinions: OpinionDTO[] }
    | { type: 'opinion'; opinion: OpinionDTO }
    | { type: 'vote'; opinionId: string; votes?: number }
    | { type: 'reaction'; opinionId: string; emoji: string; count?: number }
    | { type: 'move'; opinionId: string; x: number; y: number }
    | { type: 'delete'; opinionId: string }
    | { type: 'deleted'; opinionId: string }
    | { type: 'error'; message: string }
    | { type: 'joined'; roomId: string; opinions: OpinionDTO[]; users: UserDTO[] }
    | { type: 'user_joined'; user: UserDTO }
    | { type: 'user_left'; userId: string }
    | { type: 'sync_users'; users: UserDTO[] }
    | { type: 'room_closing'; reason: string };

export interface UserDTO {
    id: string;
    name: string;
    isOwner: boolean;
}
