// ロビー画面用エントリーポイント
import './style.css';

// DOM要素
const createRoomBtn = document.getElementById('createRoom')!;
const joinRoomBtn = document.getElementById('joinRoom')!;
const roomIdInput = document.getElementById('roomIdInput') as HTMLInputElement;
const userNameInput = document.getElementById('userNameInput') as HTMLInputElement;

// ロード時に名前復元
window.addEventListener('load', () => {
    const savedName = localStorage.getItem('opinion-board-user-name');
    if (savedName) userNameInput.value = savedName;
});

// 名前保存
function saveName(): string {
    const name = userNameInput.value.trim() || 'Guest';
    localStorage.setItem('opinion-board-user-name', name);
    return name;
}

// サーバーとWebSocket接続してルームを作成
function handleCreateRoom(): void {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const clientId = getClientId();
    const name = saveName();
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?clientId=${clientId}&name=${encodeURIComponent(name)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        // 作成リクエスト送信
        ws.send(JSON.stringify({ type: 'create', clientId }));
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'joined') {
            // ルーム作成成功 -> ボードページへ遷移
            window.location.href = `/board.html?room=${message.roomId}`;
        }
    };
}

// ルームに参加（ページ遷移のみ）
function handleJoinRoom(): void {
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (!roomId) {
        alert('ルームIDを入力してください');
        return;
    }
    if (roomId.length !== 6) {
        alert('ルームIDは6文字です');
        return;
    }

    saveName();
    // ボードページへ遷移（実際の参加処理はボードページで行う）
    window.location.href = `/board.html?room=${roomId}`;
}

// クライアントID取得（なければ生成）
function getClientId(): string {
    const stored = localStorage.getItem('opinion-board-client-id');
    if (stored) return stored;
    const id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('opinion-board-client-id', id);
    return id;
}

// イベントリスナー
createRoomBtn.addEventListener('click', handleCreateRoom);
joinRoomBtn.addEventListener('click', handleJoinRoom);

// エンターキーで参加
roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleJoinRoom();
});
