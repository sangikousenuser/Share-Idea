// 共有型定義

import type { WebSocket as WsWebSocket } from 'ws';

export interface Opinion {
    id: string;
    text: string;
    imageUrl?: string;
    x: number;
    y: number;
    votes: number;
    votedBy: Set<string>;
    reactions: Map<string, Set<string>>; // emoji -> Set<userId>
    creatorId: string;  // 作成者ID
    createdAt: number;
}

export interface Room {
    id: string;
    opinions: Map<string, Opinion>;
    clients: Set<WsWebSocket>;
    createdAt: number;
    timeoutId?: NodeJS.Timeout;
}

// WebSocket メッセージ型
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
    | { type: 'joined'; roomId: string; opinions: OpinionDTO[] }
    | { type: 'room_closing'; reason: string };

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

export function opinionToDTO(opinion: Opinion): OpinionDTO {
    return {
        id: opinion.id,
        text: opinion.text,
        imageUrl: opinion.imageUrl,
        x: opinion.x,
        y: opinion.y,
        votes: opinion.votes,
        reactions: Object.fromEntries(
            Array.from(opinion.reactions.entries()).map(([emoji, users]) => [emoji, users.size])
        ),
        creatorId: opinion.creatorId,
        createdAt: opinion.createdAt
    };
}
