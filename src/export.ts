// 画像エクスポートモジュール

import html2canvas from 'html2canvas';

export async function exportAsImage(canvasElement: HTMLElement, roomId: string): Promise<void> {
    try {
        const canvas = await html2canvas(canvasElement, {
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#fafafa',
            scale: 2, // 高解像度
            useCORS: true
        });

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        link.download = `opinion-board-${roomId}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('Export failed:', err);
        alert('エクスポートに失敗しました');
    }
}
