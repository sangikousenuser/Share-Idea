// QRコード生成モジュール

import QRCode from 'qrcode';

export async function generateQRCode(url: string, container: HTMLElement): Promise<void> {
    container.innerHTML = '';

    // 現在のテーマを取得
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    try {
        const canvas = await QRCode.toCanvas(url, {
            width: 160,
            margin: 2,
            color: {
                dark: isDark ? '#fafafa' : '#18181b',
                light: isDark ? '#18181b' : '#fafafa'
            }
        });
        container.appendChild(canvas);
    } catch (err) {
        console.error('QR code generation failed:', err);
        container.textContent = 'QRコード生成に失敗しました';
    }
}
