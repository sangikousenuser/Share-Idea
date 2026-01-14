import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { Room, Opinion, WSMessage, opinionToDTO, ClientData, UserDTO } from './types.js';
import path from 'path';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// 本番用: 静的ファイル配信
app.use(express.static(path.join(process.cwd(), 'dist')));

// /board へのアクセスを board.html にルーティング
app.get('/board', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'board.html'));
});

// ルーム管理
const rooms = new Map<string, Room>();

// 定数
const ROOM_TIMEOUT_MS = 60 * 60 * 1000; // 1時間
const EMPTY_ROOM_DELAY_MS = 5000; // 5秒後に空ルーム削除

// ランダムなルームID生成 (6文字)
function generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ランダムなID生成
function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

// ルームの全クライアントにブロードキャスト
function broadcast(room: Room, message: WSMessage) {
    const data = JSON.stringify(message);
    room.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

// 自分以外にブロードキャスト
function broadcastToOthers(room: Room, excludeClientId: string, message: WSMessage) {
    const data = JSON.stringify(message);
    room.clients.forEach((client) => {
        if (client.id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

// ルーム削除処理
function deleteRoom(roomId: string, reason: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    // 全クライアントに終了通知
    const closeMsg: WSMessage = { type: 'room_closing', reason };
    broadcast(room, closeMsg);

    // 全接続を閉じる
    room.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.close();
        }
    });

    // タイマーをクリア
    if (room.timeoutId) {
        clearTimeout(room.timeoutId);
    }

    rooms.delete(roomId);
    console.log(`Room deleted (${reason}): ${roomId}`);
}

// 1時間タイムアウト設定
function setRoomTimeout(room: Room) {
    room.timeoutId = setTimeout(() => {
        deleteRoom(room.id, '1時間が経過したためルームを終了しました');
    }, ROOM_TIMEOUT_MS);
}

// WebSocket接続ハンドラ
wss.on('connection', (ws, req) => {
    // URLからクエリパラメータ解析
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const clientId = url.searchParams.get('clientId') || generateId();
    const clientName = url.searchParams.get('name') || 'Guest';

    // クライアントデータ初期化
    const clientData: ClientData = {
        ws,
        id: clientId,
        name: clientName,
        roomId: ''
    };

    console.log(`Client connected: ${clientId} (${clientName})`);

    ws.on('message', (data: Buffer) => {
        try {
            const message: WSMessage = JSON.parse(data.toString());

            switch (message.type) {
                case 'create': {
                    const roomId = generateRoomId();
                    const room: Room = {
                        id: roomId,
                        ownerId: clientId,
                        opinions: new Map(),
                        clients: new Map(),
                        createdAt: Date.now()
                    };

                    // 自分を追加
                    clientData.roomId = roomId;
                    room.clients.set(clientId, clientData);
                    rooms.set(roomId, room);

                    // 1時間タイムアウト設定
                    setRoomTimeout(room);

                    const userDTO: UserDTO = { id: clientId, name: clientName, isOwner: true };

                    const response: WSMessage = {
                        type: 'joined',
                        roomId,
                        opinions: [],
                        users: [userDTO]
                    };
                    ws.send(JSON.stringify(response));
                    console.log(`Room created: ${roomId} by ${clientId}`);
                    break;
                }

                case 'join': {
                    const room = rooms.get(message.roomId.toUpperCase());
                    if (!room) {
                        const error: WSMessage = { type: 'error', message: 'ルームが見つかりません' };
                        ws.send(JSON.stringify(error));
                        return;
                    }

                    clientData.roomId = room.id;
                    room.clients.set(clientId, clientData);

                    const opinions = Array.from(room.opinions.values()).map(opinionToDTO);
                    const users = Array.from(room.clients.values()).map(c => ({
                        id: c.id,
                        name: c.name,
                        isOwner: c.id === room.ownerId
                    }));

                    const response: WSMessage = {
                        type: 'joined',
                        roomId: room.id,
                        opinions,
                        users
                    };
                    ws.send(JSON.stringify(response));

                    // 他の参加者に通知
                    const joinNotification: WSMessage = {
                        type: 'user_joined',
                        user: { id: clientId, name: clientName, isOwner: clientId === room.ownerId }
                    };
                    broadcastToOthers(room, clientId, joinNotification);

                    console.log(`Client joined room: ${room.id} (${room.clients.size} clients)`);
                    break;
                }

                case 'opinion': {
                    const currentRoom = rooms.get(clientData.roomId);
                    if (!currentRoom) return;

                    const opinion: Opinion = {
                        id: generateId(),
                        text: message.opinion.text,
                        imageUrl: message.opinion.imageUrl,
                        x: message.opinion.x,
                        y: message.opinion.y,
                        votes: 0,
                        votedBy: new Set(),
                        reactions: new Map(),
                        creatorId: clientId,
                        createdAt: Date.now()
                    };
                    currentRoom.opinions.set(opinion.id, opinion);

                    const broadcastMsg: WSMessage = {
                        type: 'opinion',
                        opinion: opinionToDTO(opinion)
                    };
                    broadcast(currentRoom, broadcastMsg);
                    break;
                }

                case 'vote': {
                    const currentRoom = rooms.get(clientData.roomId);
                    if (!currentRoom) return;

                    const opinion = currentRoom.opinions.get(message.opinionId);
                    if (!opinion) return;

                    // 同一クライアントからの重複投票を防止
                    if (!opinion.votedBy.has(clientId)) {
                        opinion.votedBy.add(clientId);
                        opinion.votes++;

                        const voteMsg: WSMessage = {
                            type: 'vote',
                            opinionId: opinion.id,
                            votes: opinion.votes
                        };
                        broadcast(currentRoom, voteMsg);
                    }
                    break;
                }

                case 'reaction': {
                    const currentRoom = rooms.get(clientData.roomId);
                    if (!currentRoom) return;

                    const opinion = currentRoom.opinions.get(message.opinionId);
                    if (opinion) {
                        let users = opinion.reactions.get(message.emoji);
                        if (!users) {
                            users = new Set();
                            opinion.reactions.set(message.emoji, users);
                        }

                        // トグル動作
                        if (users.has(clientId)) {
                            users.delete(clientId);
                        } else {
                            users.add(clientId);
                        }

                        if (users.size === 0) {
                            opinion.reactions.delete(message.emoji);
                        }

                        broadcast(currentRoom, {
                            type: 'reaction',
                            opinionId: opinion.id,
                            emoji: message.emoji,
                            count: users.size
                        });
                    }
                    break;
                }

                case 'move': {
                    const currentRoom = rooms.get(clientData.roomId);
                    if (!currentRoom) return;

                    const opinion = currentRoom.opinions.get(message.opinionId);
                    if (!opinion) return;

                    opinion.x = message.x;
                    opinion.y = message.y;

                    const moveMsg: WSMessage = {
                        type: 'move',
                        opinionId: opinion.id,
                        x: opinion.x,
                        y: opinion.y
                    };
                    // 送信者以外にブロードキャスト（自分はすでに動いているため）
                    broadcastToOthers(currentRoom, clientData.id, moveMsg);
                    break;
                }

                case 'delete': {
                    const currentRoom = rooms.get(clientData.roomId);
                    if (!currentRoom) return;

                    const opinion = currentRoom.opinions.get(message.opinionId);
                    if (!opinion) return;

                    // 作成者のみ削除可能
                    if (opinion.creatorId !== clientId) {
                        const error: WSMessage = { type: 'error', message: '自分の意見のみ削除できます' };
                        ws.send(JSON.stringify(error));
                        return;
                    }

                    currentRoom.opinions.delete(message.opinionId);

                    const deleteMsg: WSMessage = {
                        type: 'deleted',
                        opinionId: message.opinionId
                    };
                    broadcast(currentRoom, deleteMsg);
                    break;
                }
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        if (clientData.roomId) {
            const currentRoom = rooms.get(clientData.roomId);
            if (currentRoom) {
                currentRoom.clients.delete(clientData.id);
                console.log(`Client disconnected from room: ${currentRoom.id} (${currentRoom.clients.size} remaining)`);

                // 退出通知
                const leaveMsg: WSMessage = { type: 'user_left', userId: clientData.id };
                broadcast(currentRoom, leaveMsg);

                // 全員退出したら5秒後に削除
                if (currentRoom.clients.size === 0) {
                    const roomId = currentRoom.id;
                    setTimeout(() => {
                        const room = rooms.get(roomId);
                        if (room && room.clients.size === 0) {
                            deleteRoom(roomId, '全員が退出しました');
                        }
                    }, EMPTY_ROOM_DELAY_MS);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
