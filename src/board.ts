// ボード画面用エントリーポイント

import './style.css';
import type { WSMessage, OpinionDTO } from './types';
import { createOpinionCard, updateOpinionVotes, updateOpinionPosition, removeOpinionCard, setDeleteCallback, updateOpinionReactions } from './opinion';
import { setMoveCallback } from './drag';
import { setVoteCallback } from './vote';
import { setReactionCallback } from './reaction';
import { generateQRCode } from './qr';
import { exportAsImage } from './export';

// 状態管理
let ws: WebSocket | null = null;
let clientId: string = getClientId();
let currentRoomId: string | null = null;
let pendingImageUrl: string | null = null;

// DOM要素
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

// クライアントID取得
function getClientId(): string {
    const stored = localStorage.getItem('opinion-board-client-id');
    if (stored) return stored;
    const id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('opinion-board-client-id', id);
    return id;
}

// URLパラメータからルームIDを取得して参加
function joinRoomFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');

    if (!roomId) {
        alert('ルームIDが指定されていません');
        window.location.href = '/';
        return;
    }

    currentRoomId = roomId;
    roomIdDisplay.textContent = roomId;
    connectWebSocket(roomId);
}

// WebSocket接続
function connectWebSocket(roomId: string): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        // 参加リクエスト送信
        send({ type: 'join', roomId, clientId });
    };

    ws.onmessage = (event) => {
        handleMessage(JSON.parse(event.data));
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        alert('サーバーとの接続が切れました');
        window.location.href = '/';
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
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
            updateOpinionVotes(message.opinionId, message.votes ?? 0);
            break;

        case 'reaction':
            updateOpinionReactions(message.opinionId, message.emoji, message.count ?? 0);
            break;

        case 'move':
            updateOpinionPosition(message.opinionId, message.x, message.y);
            break;

        case 'error':
            showError(message.message);
            break;

        case 'room_closing':
            showError(message.reason);
            break;

        case 'deleted':
            removeOpinionCard(message.opinionId);
            break;
    }
}

// エラー表示
function showError(message: string): void {
    canvas.innerHTML = `
        <div class="error-container">
            <h2>😵 接続エラー</h2>
            <p>${message}</p>
            <a href="/" class="btn btn-primary">トップへ戻る</a>
        </div>
    `;

    // 入力を無効化
    opinionInput.disabled = true;
    (submitOpinionBtn as HTMLButtonElement).disabled = true;
    (attachImageBtn as HTMLButtonElement).disabled = true;
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
        reactions: {},
        creatorId: clientId,
        createdAt: Date.now()
    };

    send({ type: 'opinion', opinion });
    opinionInput.value = '';
    clearPendingImage();
}

// 画像添付関連
function handleImageSelect(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
        alert('画像サイズは500KB以下にしてください');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        pendingImageUrl = e.target?.result as string;
        previewImg.src = pendingImageUrl;
        imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
}

function clearPendingImage(): void {
    pendingImageUrl = null;
    previewImg.src = '';
    imagePreview.classList.add('hidden');
}

// 共有モーダル
function openShareModal(): void {
    if (!currentRoomId) return;

    const url = `${window.location.origin}/board.html?room=${currentRoomId}`;
    shareUrlDisplay.textContent = url;

    qrCodeContainer.innerHTML = '';
    generateQRCode(url, qrCodeContainer);

    shareModal.classList.remove('hidden');
}

function closeShareModal(): void {
    shareModal.classList.add('hidden');
}

// テーマ切り替え
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function getStoredTheme(): 'light' | 'dark' | null {
    return localStorage.getItem('theme') as 'light' | 'dark' | null;
}

function setTheme(theme: 'light' | 'dark'): void {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function initTheme(): void {
    const stored = getStoredTheme();
    const theme = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(theme);
}

themeToggle?.addEventListener('click', () => {
    const current = html.getAttribute('data-theme') as 'light' | 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
});

// イベントリスナー登録
submitOpinionBtn.addEventListener('click', submitOpinion);
opinionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitOpinion();
});

leaveRoomBtn.addEventListener('click', () => {
    if (confirm('ルームから退出しますか？')) {
        window.location.href = '/';
    }
});

shareBtn.addEventListener('click', openShareModal);
copyUrlBtn.addEventListener('click', () => {
    const url = shareUrlDisplay.textContent;
    if (url) {
        navigator.clipboard.writeText(url).then(() => alert('コピーしました'));
    }
});
closeModalBtn.addEventListener('click', closeShareModal);
shareModal.querySelector('.modal-backdrop')?.addEventListener('click', closeShareModal);

attachImageBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', handleImageSelect);
removeImageBtn.addEventListener('click', clearPendingImage);

exportBtn.addEventListener('click', () => {
    if (currentRoomId) exportAsImage(canvas, currentRoomId);
});

// 削除コールバック設定
setDeleteCallback((opinionId: string) => {
    send({ type: 'delete', opinionId });
});

// 移動コールバック設定
setMoveCallback((opinionId, x, y) => {
    send({ type: 'move', opinionId, x, y });
});

// 投票コールバック設定
setVoteCallback((opinionId) => {
    send({ type: 'vote', opinionId });
});

// リアクションコールバック設定
setReactionCallback((opinionId, emoji) => {
    send({ type: 'reaction', opinionId, emoji });
});

// 初期化
initTheme();
joinRoomFromUrl();
