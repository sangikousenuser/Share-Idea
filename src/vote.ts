// 投票機能モジュール

import { sendVote } from './main';

const votedOpinions = new Set<string>();

export function initVote(btn: HTMLElement, opinionId: string, _clientId: string): void {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();

        // 既に投票済みの場合は何もしない
        if (votedOpinions.has(opinionId)) return;

        votedOpinions.add(opinionId);
        btn.classList.add('voted');

        // サーバーに投票を送信
        sendVote(opinionId);
    });

    // 既に投票済みならスタイル適用
    if (votedOpinions.has(opinionId)) {
        btn.classList.add('voted');
    }
}

export function markAsVoted(opinionId: string): void {
    votedOpinions.add(opinionId);
    const btn = document.querySelector(`[data-opinion-id="${opinionId}"]`);
    if (btn) {
        btn.classList.add('voted');
    }
}
