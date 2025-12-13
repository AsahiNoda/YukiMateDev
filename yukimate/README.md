# YukiMate

スキー・スノーボード愛好者のためのソーシャルプラットフォーム

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成します：

```bash
cp .env.example .env
```

`.env`ファイルを編集して、Supabaseの認証情報を設定します：

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Supabase認証情報の取得方法：**
1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. プロジェクトを選択
3. Settings → API に移動
4. `Project URL`を`EXPO_PUBLIC_SUPABASE_URL`に設定
5. `anon/public key`を`EXPO_PUBLIC_SUPABASE_ANON_KEY`に設定

⚠️ **セキュリティ注意事項：**
- `.env`ファイルは絶対にGitにコミットしないでください
- 本番環境では、環境変数を適切に管理してください（EAS Secrets等）

### 3. アプリの起動

```bash
npx expo start
```

開発メニューから以下を選択：
- `i` - iOSシミュレータで起動
- `a` - Androidエミュレータで起動
- Expo Goアプリでスキャン

## 🏗️ プロジェクト構成

```
yukimate/
├── src/
│   ├── app/              # Expo Router（画面）
│   ├── components/       # 再利用可能なコンポーネント
│   ├── hooks/            # カスタムフック
│   ├── services/         # APIサービス
│   ├── lib/              # ライブラリ設定
│   ├── constants/        # 定数
│   └── types/            # TypeScript型定義
├── assets/               # 画像、フォント等
├── .env                  # 環境変数（gitignore）
├── .env.example          # 環境変数テンプレート
├── app.config.js         # Expo設定（動的）
└── package.json
```

## 🔑 主要機能

- ✅ ユーザー認証（Supabase Auth）
- ✅ イベント作成・管理
- ✅ リアルタイムチャット
- ✅ ソーシャル機能（スター、ブロック）
- ✅ 天気情報統合（Snowfeed）
- ✅ プロフィール管理
- ✅ プッシュ通知

## 🛠️ 技術スタック

- **フレームワーク**: React Native + Expo
- **ルーティング**: Expo Router
- **バックエンド**: Supabase（Auth, Database, Storage, Realtime）
- **言語**: TypeScript
- **UI**: React Native（カスタムコンポーネント）

## 📱 対応プラットフォーム

- iOS
- Android
- Web（限定サポート）

## 🔐 セキュリティ

このプロジェクトでは以下のセキュリティ対策を実施しています：

- 環境変数による認証情報管理
- Supabase Row Level Security (RLS)
- セッションベース認証
- 入力値検証（実装中）

## 📄 ライセンス

All rights reserved.
