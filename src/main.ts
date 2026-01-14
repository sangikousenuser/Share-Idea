// メインエントリーポイント

import './style.css';
import type { WSMessage, OpinionDTO } from './types';
import { createOpinionCard, updateOpinionVotes, updateOpinionPosition, removeOpinionCard, setDeleteCallback } from './opinion';
import { generateQRCode } from './qr';
import { exportAsImage } from './export';

// 状態管理
let ws: WebSocket | null = null;
let clientId: string = generateClientId();
let currentRoomId: string | null = null;
let pendingImageUrl: string | null = null;

// DOM要素
const lobbyScreen = document.getElementById('lobby')!;
const boardScreen = document.getElementById('board')!;
const createRoomBtn = document.getElementById('createRoom')!;
const joinRoomBtn = document.getElementById('joinRoom')!;
const roomIdInput = document.getElementById('roomIdInput') as HTMLInputElement;
const roomIdDisplay = document.getElementById('roomIdDisplay')!;
const shareBtn = document.getElementById('shareBtn')!;
const exportBtn = document.getElementById('exportBtn')!;
const leaveRoomBtn = document.getElementById('leaveRoom')!;
const canvas = document.getElementById('canvas')!;
const opinionInput = document.getElementById('opinionInput') as HTMLInputElement;
const submitOpinionBtn = document.getElementById('submitOpinion')!;
const shareModal = document.getElementById('shareModal')!;
const qrCodeContainer = document.getElementById('qrCode')!;
const shareUrlDisplay = document.getElementById('shareUrl')!;
const copyUrlBtn = document.getElementById('copyUrl')!;
const closeModalBtn = document.getElementById('closeModal')!;
const attachImageBtn = document.getElementById('attachImage')!;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const imagePreview = document.getElementById('imagePreview')!;
const previewImg = document.getElementById('previewImg') as HTMLImageElement;
const removeImageBtn = document.getElementById('removeImage')!;

// クライアントID生成
function generateClientId(): string {
    const stored = localStorage.getItem('opinion-board-client-id');
    if (stored) return stored;

    const id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('opinion-board-client-id', id);
    return id;
}

// WebSocket接続
function connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            resolve();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        };

        ws.onmessage = (event) => {
            handleMessage(JSON.parse(event.data));
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };
    });
}

// メッセージ送信
function send(message: WSMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// メッセージハンドラ
function handleMessage(message: WSMessage): void {
    switch (message.type) {
        case 'joined':
            currentRoomId = message.roomId;
            roomIdDisplay.textContent = message.roomId;
            showBoard();

            // 既存の意見を表示
            message.opinions.forEach((opinion) => {
                const card = createOpinionCard(opinion, clientId);
                canvas.appendChild(card);
            });
            break;

        case 'opinion':
            const card = createOpinionCard(message.opinion, clientId);
            canvas.appendChild(card);
            break;

        case 'vote':
            updateOpinionVotes(message.opinionId, message.votes);
            break;

        case 'move':
            updateOpinionPosition(message.opinionId, message.x, message.y);
            break;

        case 'error':
            alert(message.message);
            break;

        case 'room_closing':
            alert(message.reason);
            leaveRoom();
            break;

        case 'deleted':
            removeOpinionCard(message.opinionId);
            break;
    }
}

// 画面切り替え
function showLobby(): void {
    lobbyScreen.classList.remove('hidden');
    boardScreen.classList.add('hidden');
}

function showBoard(): void {
    lobbyScreen.classList.add('hidden');
    boardScreen.classList.remove('hidden');
    opinionInput.focus();
}

// ルーム作成
async function createRoom(): Promise<void> {
    try {
        await connectWebSocket();
        send({ type: 'create', clientId });
    } catch {
        alert('サーバーに接続できませんでした');
    }
}

// ルーム参加
async function joinRoom(roomId: string): Promise<void> {
    if (!roomId.trim()) {
        alert('ルームIDを入力してください');
        return;
    }

    try {
        await connectWebSocket();
        send({ type: 'join', roomId: roomId.toUpperCase(), clientId });
    } catch {
        alert('サーバーに接続できませんでした');
    }
}

// 意見送信
function submitOpinion(): void {
    const text = opinionInput.value.trim();

    // テキストも画像もなければ何もしない
    if (!text && !pendingImageUrl) return;

    // ランダムな位置に配置
    const canvasRect = canvas.getBoundingClientRect();
    const x = Math.random() * (canvasRect.width - 200) + 50;
    const y = Math.random() * (canvasRect.height - 150) + 50;

    const opinion: OpinionDTO = {
        id: '',
        text,
        imageUrl: pendingImageUrl || undefined,
        x,
        y,
        votes: 0,
        creatorId: clientId,
        createdAt: Date.now()
    };

    send({ type: 'opinion', opinion });
    opinionInput.value = '';
    clearPendingImage();
}

// 画像添付
function handleImageSelect(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // ファイルサイズチェック (500KB以下)
    if (file.size > 500 * 1024) {
        alert('画像サイズは500KB以下にしてください');
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingImageUrl = ev.target?.result as string;
        previewImg.src = pendingImageUrl;
        imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearPendingImage(): void {
    pendingImageUrl = null;
    imageInput.value = '';
    imagePreview.classList.add('hidden');
}

// 外部からアクセス可能な関数
export function sendVote(opinionId: string): void {
    send({ type: 'vote', opinionId, votes: 0 });
}

export function sendMove(opinionId: string, x: number, y: number): void {
    send({ type: 'move', opinionId, x, y });
}

// 共有モーダル
async function openShareModal(): Promise<void> {
    if (!currentRoomId) return;

    const shareUrl = `${window.location.origin}?room=${currentRoomId}`;
    shareUrlDisplay.textContent = shareUrl;

    await generateQRCode(shareUrl, qrCodeContainer);
    shareModal.classList.remove('hidden');
}

function closeShareModal(): void {
    shareModal.classList.add('hidden');
}

async function copyShareUrl(): Promise<void> {
    if (!currentRoomId) return;

    const shareUrl = `${window.location.origin}?room=${currentRoomId}`;
    try {
        await navigator.clipboard.writeText(shareUrl);
        copyUrlBtn.textContent = 'コピーしました！';
        setTimeout(() => {
            copyUrlBtn.textContent = 'URLをコピー';
        }, 2000);
    } catch {
        alert('コピーに失敗しました');
    }
}

// 画像エクスポート
function handleExport(): void {
    if (!currentRoomId) return;
    exportAsImage(canvas, currentRoomId);
}

// ルームを離れる
function leaveRoom(): void {
    if (ws) {
        ws.close();
        ws = null;
    }
    currentRoomId = null;
    canvas.innerHTML = '';
    clearPendingImage();
    showLobby();
}

// URLパラメータからルームIDを取得
function checkUrlParams(): void {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId) {
        roomIdInput.value = roomId;
        joinRoom(roomId);
    }
}

// イベントリスナー設定
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', () => joinRoom(roomIdInput.value));
roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom(roomIdInput.value);
});
submitOpinionBtn.addEventListener('click', submitOpinion);
opinionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitOpinion();
});
shareBtn.addEventListener('click', openShareModal);
exportBtn.addEventListener('click', handleExport);
closeModalBtn.addEventListener('click', closeShareModal);
copyUrlBtn.addEventListener('click', copyShareUrl);
leaveRoomBtn.addEventListener('click', leaveRoom);
shareModal.querySelector('.modal-backdrop')?.addEventListener('click', closeShareModal);
attachImageBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', handleImageSelect);
removeImageBtn.addEventListener('click', clearPendingImage);

// テーマ切り替え
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function getStoredTheme(): 'light' | 'dark' | null {
    return localStorage.getItem('theme') as 'light' | 'dark' | null;
}

function getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme: 'light' | 'dark'): void {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme(): void {
    const current = html.getAttribute('data-theme') as 'light' | 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme(): void {
    const stored = getStoredTheme();
    const theme = stored ?? getSystemTheme();
    setTheme(theme);
}

themeToggle?.addEventListener('click', toggleTheme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!getStoredTheme()) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// 初期化
initTheme();
checkUrlParams();

// 削除コールバック設定
setDeleteCallback((opinionId: string) => {
    send({ type: 'delete', opinionId });
});
