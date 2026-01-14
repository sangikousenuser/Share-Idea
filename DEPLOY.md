# Railway デプロイ手順

## 1. GitHubリポジトリを作成

```bash
cd /Users/taro/Desktop/share
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/opinion-board.git
git push -u origin main
```

## 2. Railwayでプロジェクト作成

1. [railway.app](https://railway.app/) にアクセス
2. GitHub でログイン
3. **New Project** → **Deploy from GitHub repo**
4. リポジトリを選択

## 3. 設定確認

Railway が自動検出するか、以下を手動設定：

| 項目 | 値 |
|------|-----|
| Build Command | `npm run build` |
| Start Command | `npm run start` |
| Port | 自動（環境変数PORTを使用） |

## 4. デプロイ完了後

- Railway がURLを発行 (例: `opinion-board-xxx.up.railway.app`)
- WebSocket も同じURLで動作

## ファイル構成

```
share/
├── railway.json      # Railway設定
├── package.json      # startスクリプト追加済み
├── tsconfig.server.json  # サーバービルド設定
├── dist/             # ビルド出力
│   ├── index.html    # フロントエンド
│   └── server/       # サーバーJS
└── server/           # サーバーソース
```
