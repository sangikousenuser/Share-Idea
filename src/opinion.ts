// 意見カード管理モジュール

import type { OpinionDTO } from './types';
import { initDrag } from './drag';
import { initVote } from './vote';
import { parseMarkdown } from './markdown';

// 投票数に応じたスケール計算（1.0〜2.0）
function calculateScale(votes: number): number {
  const baseScale = 1.0;
  const scalePerVote = 0.08;
  const maxScale = 2.0;

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

  // 画像があれば表示
  const imageHtml = opinion.imageUrl
    ? `<img class="opinion-image" src="${opinion.imageUrl}" alt="添付画像" />`
    : '';

  // テキストがあれば表示（Markdown対応）
  const textHtml = opinion.text
    ? `<div class="opinion-text">${parseMarkdown(opinion.text)}</div>`
    : '';

  card.innerHTML = `
    ${imageHtml}
    ${textHtml}
    <div class="opinion-footer">
      <button class="vote-btn" data-opinion-id="${opinion.id}">
        <span class="vote-icon">👍</span>
        <span class="vote-count">${opinion.votes}</span>
      </button>
    </div>
  `;

  // ドラッグ機能を初期化
  initDrag(card, opinion.id);

  // 投票機能を初期化
  const voteBtn = card.querySelector('.vote-btn') as HTMLElement;
  initVote(voteBtn, opinion.id, clientId);

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
