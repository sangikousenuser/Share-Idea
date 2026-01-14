// 意見カード管理モジュール

import type { OpinionDTO } from './types';
import { initDrag } from './drag';
import { initVote } from './vote';
import { createReactionContainer, addOrUpdateReactionBadge } from './reaction';
import { parseMarkdown } from './markdown';

// 削除コールバック（main.tsで設定）
let deleteCallback: ((opinionId: string) => void) | null = null;

export function setDeleteCallback(callback: (opinionId: string) => void): void {
  deleteCallback = callback;
}

// 投票数に応じたスケール計算（1.0〜1.5）
function calculateScale(votes: number): number {
  const baseScale = 1.0;
  const scalePerVote = 0.05;
  const maxScale = 1.5;

  return Math.min(baseScale + votes * scalePerVote, maxScale);
}

export function createOpinionCard(opinion: OpinionDTO, clientId: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'opinion-card';
  card.dataset.id = opinion.id;
  card.style.left = `${opinion.x}px`;
  card.style.top = `${opinion.y}px`;

  // スケール適用
  const scale = calculateScale(opinion.votes);
  card.style.transform = `scale(${scale})`;
  card.style.transformOrigin = 'top left';

  // 自分の投稿か判定
  const isOwner = opinion.creatorId === clientId;

  // 画像があれば表示
  const imageHtml = opinion.imageUrl
    ? `<img class="opinion-image" src="${opinion.imageUrl}" alt="添付画像" />`
    : '';

  // テキストがあれば表示（Markdown対応）
  const textHtml = opinion.text
    ? `<div class="opinion-text">${parseMarkdown(opinion.text)}</div>`
    : '';

  // 削除ボタン（作成者のみ表示）
  const deleteHtml = isOwner
    ? `<button class="delete-btn" data-opinion-id="${opinion.id}" title="削除">🗑️</button>`
    : '';

  card.innerHTML = `
    ${deleteHtml}
    ${imageHtml}
    ${textHtml}
    <div class="opinion-footer">
      <button class="vote-btn" data-opinion-id="${opinion.id}">
        <span class="vote-icon">👍</span>
        <span class="vote-count">${opinion.votes}</span>
      </button>
    </div>
  `;

  // リアクションコンテナ追加
  const footer = card.querySelector('.opinion-footer');
  if (footer) {
    const reactionContainer = createReactionContainer(opinion.id, opinion.reactions);
    footer.appendChild(reactionContainer);
  }

  // ドラッグ機能を初期化
  initDrag(card, opinion.id);

  // 投票機能を初期化
  const voteBtn = card.querySelector('.vote-btn') as HTMLElement;
  initVote(voteBtn, opinion.id, clientId);

  // 削除ボタンのイベント
  const deleteBtn = card.querySelector('.delete-btn') as HTMLElement;
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (deleteCallback && confirm('この意見を削除しますか？')) {
        deleteCallback(opinion.id);
      }
    });
  }

  return card;
}

export function updateOpinionVotes(opinionId: string, votes: number): void {
  const card = document.querySelector(`[data-id="${opinionId}"]`) as HTMLElement;
  if (!card) return;

  // 投票数更新
  const voteCount = card.querySelector('.vote-count');
  if (voteCount) {
    voteCount.textContent = String(votes);
  }

  // スケール更新
  const scale = calculateScale(votes);
  card.style.transform = `scale(${scale})`;
}

export function updateOpinionPosition(opinionId: string, x: number, y: number): void {
  const card = document.querySelector(`[data-id="${opinionId}"]`) as HTMLElement;
  if (!card) return;

  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}

export function updateOpinionReactions(opinionId: string, emoji: string, count: number): void {
  const card = document.querySelector(`[data-id="${opinionId}"]`) as HTMLElement;
  if (!card) return;

  const container = card.querySelector('.reaction-container') as HTMLElement;
  if (container) {
    addOrUpdateReactionBadge(container, opinionId, emoji, count);
  }
}

export function removeOpinionCard(opinionId: string): void {
  const card = document.querySelector(`[data-id="${opinionId}"]`);
  if (card) {
    card.remove();
  }
}
