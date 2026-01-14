// Markdown風書式パーサー

/**
 * シンプルなMarkdown風書式をHTMLに変換
 * 対応書式:
 * - **太字** → <strong>
 * - *イタリック* → <em>
 * - # 見出し → <span class="heading">
 * - `コード` → <code>
 */
export function parseMarkdown(text: string): string {
    let html = escapeHtml(text);

    // 見出し（行頭の # ）
    html = html.replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, content) => {
        const level = hashes.length;
        return `<span class="md-heading md-h${level}">${content}</span>`;
    });

    // 太字 **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // イタリック *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // インラインコード `code`
    html = html.replace(/`(.+?)`/g, '<code class="md-code">$1</code>');

    // 改行を保持
    html = html.replace(/\n/g, '<br>');

    return html;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
