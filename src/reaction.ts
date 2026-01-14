// リアクション機能モジュール

// リアクション送信コールバック（board.tsで設定）
let reactionCallback: ((opinionId: string, emoji: string) => void) | null = null;

export function setReactionCallback(callback: (opinionId: string, emoji: string) => void): void {
    reactionCallback = callback;
}

// サポートする絵文字リスト
const AVAILABLE_EMOJIS = ['👍', '❤️', '🎉', '🤔', '👀'];

// リアクションコンテナ作成
export function createReactionContainer(opinionId: string, initialReactions: { [emoji: string]: number }): HTMLElement {
    const container = document.createElement('div');
    container.className = 'reaction-container';

    // 既存のリアクションを表示
    Object.entries(initialReactions).forEach(([emoji, count]) => {
        if (count > 0) {
            addOrUpdateReactionBadge(container, opinionId, emoji, count);
        }
    });

    // リアクション追加ボタン
    const addBtn = document.createElement('button');
    addBtn.className = 'reaction-add-btn';
    addBtn.textContent = '☺+';
    addBtn.onclick = (e) => {
        e.stopPropagation();
        showEmojiPicker(e, opinionId);
    };
    container.appendChild(addBtn);

    return container;
}

// リアクションバッジ（絵文字+カウント）の追加または更新
export function addOrUpdateReactionBadge(container: HTMLElement, opinionId: string, emoji: string, count: number): void {
    let badge = container.querySelector(`.reaction-badge[data-emoji="${emoji}"]`) as HTMLElement;

    if (count <= 0) {
        if (badge) badge.remove();
        return;
    }

    if (!badge) {
        badge = document.createElement('button');
        badge.className = 'reaction-badge';
        badge.setAttribute('data-emoji', emoji);
        badge.onclick = (e) => {
            e.stopPropagation();
            if (reactionCallback) reactionCallback(opinionId, emoji);
        };
        // Addボタンの前に挿入
        const addBtn = container.querySelector('.reaction-add-btn');
        container.insertBefore(badge, addBtn);
    }

    badge.textContent = `${emoji} ${count}`;
}

// 簡易絵文字ピッカー表示
function showEmojiPicker(e: MouseEvent, opinionId: string): void {
    const existingPicker = document.querySelector('.emoji-picker-popover');
    if (existingPicker) existingPicker.remove();

    const picker = document.createElement('div');
    picker.className = 'emoji-picker-popover';

    AVAILABLE_EMOJIS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.className = 'emoji-option';
        btn.onclick = (ev) => {
            ev.stopPropagation();
            if (reactionCallback) reactionCallback(opinionId, emoji);
            picker.remove();
        };
        picker.appendChild(btn);
    });

    // クリック位置の近くに表示
    picker.style.left = `${e.clientX}px`;
    picker.style.top = `${e.clientY}px`;

    document.body.appendChild(picker);

    // 外部クリックで閉じる
    setTimeout(() => {
        document.addEventListener('click', function closePicker(ev) {
            if (!picker.contains(ev.target as Node)) {
                picker.remove();
                document.removeEventListener('click', closePicker);
            }
        });
    }, 0);
}
