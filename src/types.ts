// フロントエンド用型定義

export interface OpinionDTO {
    id: string;
    text: string;
    imageUrl?: string;
    x: number;
    y: number;
    votes: number;
    createdAt: number;
}

export type WSMessage =
    | { type: 'join'; roomId: string; clientId: string }
    | { type: 'create'; clientId: string }
    | { type: 'sync'; opinions: OpinionDTO[] }
    | { type: 'opinion'; opinion: OpinionDTO }
    | { type: 'vote'; opinionId: string; votes: number }
    | { type: 'move'; opinionId: string; x: number; y: number }
    | { type: 'error'; message: string }
    | { type: 'joined'; roomId: string; opinions: OpinionDTO[] }
    | { type: 'room_closing'; reason: string };
