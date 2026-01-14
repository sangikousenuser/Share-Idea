// ドラッグ機能モジュール

import { sendMove } from './main';

interface DragState {
    isDragging: boolean;
    cardId: string | null;
    offsetX: number;
    offsetY: number;
}

const state: DragState = {
    isDragging: false,
    cardId: null,
    offsetX: 0,
    offsetY: 0
};

export function initDrag(card: HTMLElement, opinionId: string): void {
    // マウスイベント
    card.addEventListener('mousedown', (e) => startDrag(e, card, opinionId));

    // タッチイベント
    card.addEventListener('touchstart', (e) => startDragTouch(e, card, opinionId), { passive: false });
}

function startDrag(e: MouseEvent, card: HTMLElement, opinionId: string): void {
    // 投票ボタンをクリックした場合はドラッグしない
    if ((e.target as HTMLElement).closest('.vote-btn')) return;

    e.preventDefault();
    state.isDragging = true;
    state.cardId = opinionId;

    const rect = card.getBoundingClientRect();
    state.offsetX = e.clientX - rect.left;
    state.offsetY = e.clientY - rect.top;

    card.classList.add('dragging');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function startDragTouch(e: TouchEvent, card: HTMLElement, opinionId: string): void {
    if ((e.target as HTMLElement).closest('.vote-btn')) return;

    const touch = e.touches[0];
    state.isDragging = true;
    state.cardId = opinionId;

    const rect = card.getBoundingClientRect();
    state.offsetX = touch.clientX - rect.left;
    state.offsetY = touch.clientY - rect.top;

    card.classList.add('dragging');

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
}

function onMouseMove(e: MouseEvent): void {
    if (!state.isDragging || !state.cardId) return;

    const card = document.querySelector(`[data-id="${state.cardId}"]`) as HTMLElement;
    if (!card) return;

    const canvas = document.getElementById('canvas')!;
    const canvasRect = canvas.getBoundingClientRect();

    let x = e.clientX - canvasRect.left - state.offsetX;
    let y = e.clientY - canvasRect.top - state.offsetY;

    // キャンバス内に制限
    x = Math.max(0, Math.min(x, canvasRect.width - card.offsetWidth));
    y = Math.max(0, Math.min(y, canvasRect.height - card.offsetHeight));

    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
}

function onTouchMove(e: TouchEvent): void {
    if (!state.isDragging || !state.cardId) return;
    e.preventDefault();

    const touch = e.touches[0];
    const card = document.querySelector(`[data-id="${state.cardId}"]`) as HTMLElement;
    if (!card) return;

    const canvas = document.getElementById('canvas')!;
    const canvasRect = canvas.getBoundingClientRect();

    let x = touch.clientX - canvasRect.left - state.offsetX;
    let y = touch.clientY - canvasRect.top - state.offsetY;

    x = Math.max(0, Math.min(x, canvasRect.width - card.offsetWidth));
    y = Math.max(0, Math.min(y, canvasRect.height - card.offsetHeight));

    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
}

function onMouseUp(): void {
    endDrag();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

function onTouchEnd(): void {
    endDrag();
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
}

function endDrag(): void {
    if (!state.isDragging || !state.cardId) return;

    const card = document.querySelector(`[data-id="${state.cardId}"]`) as HTMLElement;
    if (card) {
        card.classList.remove('dragging');

        // 位置をサーバーに送信
        const x = parseFloat(card.style.left) || 0;
        const y = parseFloat(card.style.top) || 0;
        sendMove(state.cardId, x, y);
    }

    state.isDragging = false;
    state.cardId = null;
}
