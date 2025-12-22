# ビルド前チェックリスト / Pre-Build Checklist

このチェックリストは、本番ビルドを作成する前に必ず確認すべき項目です。すべての項目をチェックしてからビルドを開始してください。

---

## 🔧 開発環境

- [ ] Node.jsバージョン: 20.x以上
- [ ] npm/yarnの最新版
- [ ] EAS CLIインストール済み（`eas --version`で確認）
- [ ] EASにログイン済み（`eas whoami`で確認）
- [ ] Gitの変更がすべてコミット済み

## 📝 環境変数

### ローカル環境（.env）

- [ ] `.env`ファイルが存在する
- [ ] `EXPO_PUBLIC_SUPABASE_URL`が設定されている
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`が設定されている
- [ ] `.env`が`.gitignore`に含まれている

### EAS環境変数

- [ ] `eas env:list`でEAS環境変数を確認済み
- [ ] `EXPO_PUBLIC_SUPABASE_URL`が設定されている
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`が設定されている
- [ ] `EXPO_PUBLIC_SENTRY_DSN`が設定されている（オプション）
- [ ] `EXPO_PUBLIC_AMPLITUDE_API_KEY`が設定されている（オプション）

**設定コマンド**:
```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "your_value"
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_value"
```

## 📱 アプリ設定

### app.config.js

- [ ] アプリ名が正しい: `Slope Link`
- [ ] バージョン番号が正しい（例: `1.0.0`）
- [ ] Bundle ID（iOS）: `com.slopelink.app`
- [ ] Package名（Android）: `com.slopelink.app`
- [ ] EAS Project ID設定済み: `a82327ee-4b50-4300-bafb-4e3e51b3ee98`
- [ ] アイコンファイルが存在する: `./assets/images/icon.png`
- [ ] スプラッシュ画面が設定されている

### 権限設定

- [ ] カメラ権限の説明文が適切（iOS）
- [ ] フォトライブラリ権限の説明文が適切（iOS）
- [ ] Android権限が適切（カメラ、ストレージ、通知等）

## 🔐 認証・バックエンド

### Supabase

- [ ] Supabase URLが正しい
- [ ] Anon Keyが正しい
- [ ] Supabaseプロジェクトが本番環境用
- [ ] Row Level Security（RLS）が有効
- [ ] 必要なテーブルがすべて作成されている
- [ ] Edge Functionsがデプロイ済み
  - [ ] `send-notification`
  - [ ] `schedule-event-notifications`
  - [ ] `delete-account`
- [ ] ストレージバケットが設定済み
- [ ] Realtimeが有効

### Firebase（Android）

- [ ] `google-services.json`が存在する
- [ ] Firebase Project IDが正しい
- [ ] Cloud Messagingが有効
- [ ] SHA-256証明書フィンガープリントが登録されている（本番用）

## 🎨 アセット

### アイコン

- [ ] アプリアイコン（1024x1024 PNG）が存在する
- [ ] Androidアダプティブアイコンが存在する
  - [ ] Foreground image
  - [ ] Background image
  - [ ] Monochrome image
- [ ] Faviconが存在する（Web用）

### スクリーンショット（ストア提出用）

- [ ] iPhone用スクリーンショット（6.7インチ、最低2枚）
- [ ] iPad用スクリーンショット（推奨）
- [ ] Android用スクリーンショット（携帯、最低2枚）
- [ ] Android用スクリーンショット（タブレット、推奨）
- [ ] フィーチャーグラフィック（1024x500、Android）

## 📄 法的文書

- [ ] プライバシーポリシーが作成されている
- [ ] プライバシーポリシーがオンラインで公開されている
- [ ] プライバシーポリシーのURLがアプリに記載されている
- [ ] 利用規約が作成されている
- [ ] 利用規約がオンラインで公開されている
- [ ] 利用規約のURLがアプリに記載されている

**必須記載事項**:
- 収集する個人情報の種類
- データの使用目的
- データの保存期間
- ユーザーの権利
- 連絡先

## 🧪 テスト

### 機能テスト

- [ ] ログイン/ログアウト動作確認
- [ ] 新規ユーザー登録動作確認
- [ ] プロフィール設定動作確認
- [ ] イベント作成動作確認
- [ ] イベント参加/キャンセル動作確認
- [ ] チャット送受信動作確認
- [ ] 画像アップロード動作確認
- [ ] プッシュ通知受信確認
- [ ] オフライン時の動作確認
- [ ] オンライン復帰時の同期確認
- [ ] 天気情報取得確認
- [ ] Snowfeed投稿・コメント確認
- [ ] ユーザー検索動作確認
- [ ] 設定変更動作確認
- [ ] 言語切り替え動作確認（日本語/英語）

### エラーハンドリング

- [ ] ネットワークエラー時の挙動確認
- [ ] 認証エラー時の挙動確認
- [ ] 画像アップロード失敗時の挙動確認
- [ ] APIエラー時の挙動確認
- [ ] タイムアウト時の挙動確認

### パフォーマンス

- [ ] アプリ起動時間が適切（3秒以内）
- [ ] 画面遷移がスムーズ
- [ ] 画像読み込みが適切にキャッシュされる
- [ ] メモリリークがない
- [ ] バッテリー消費が適切

### デバイステスト

- [ ] iOS実機でテスト済み（最低1機種）
- [ ] Android実機でテスト済み（最低1機種）
- [ ] 異なる画面サイズでテスト済み
- [ ] iOS最小バージョンで動作確認（iOS 13.4以上）
- [ ] Android最小バージョンで動作確認（Android 6.0以上）

## 📊 分析・監視

### Sentry（エラートラッキング）

- [ ] Sentryプロジェクトが作成されている
- [ ] Sentry DSNが設定されている
- [ ] Sentryが正しく初期化されている（[src/lib/sentry.ts](../src/lib/sentry.ts)）
- [ ] テストエラーが正しくキャプチャされる

### Amplitude（アナリティクス）

- [ ] Amplitudeプロジェクトが作成されている
- [ ] Amplitude API Keyが設定されている
- [ ] Amplitudeが正しく初期化されている（[src/lib/analytics.ts](../src/lib/analytics.ts)）
- [ ] テストイベントが正しく送信される

## 🏗️ ビルド設定

### eas.json

- [ ] 開発プロファイルが正しい
- [ ] プレビュープロファイルが正しい
- [ ] 本番プロファイルが正しい
- [ ] iOS設定が適切
- [ ] Android設定が適切
- [ ] Submit設定が記載されている（Apple ID、Service Account等）

### package.json

- [ ] すべての依存関係が最新の安定版
- [ ] 不要な依存関係が削除されている
- [ ] `expo`のバージョンが最新の安定版
- [ ] `react-native`のバージョンがExpoと互換性あり

## 🔒 セキュリティ

- [ ] APIキーが環境変数として設定されている
- [ ] シークレットキーがコードにハードコードされていない
- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] `google-services.json`が`.gitignore`に含まれている
- [ ] Supabase Row Level Securityが有効
- [ ] 認証トークンが安全に保存されている（AsyncStorage）
- [ ] HTTPSのみ使用している

## 📱 ストア準備

### App Store（iOS）

- [ ] Apple Developer Accountが有効（年間$99支払い済み）
- [ ] App Store Connectでアプリ登録済み
- [ ] Bundle IDが一致: `com.slopelink.app`
- [ ] アプリ名が登録済み: `Slope Link`
- [ ] カテゴリが設定済み: ソーシャルネットワーキング
- [ ] プライバシー質問票が回答済み
- [ ] 年齢レーティングが設定済み: 12+
- [ ] デモアカウントが準備されている
- [ ] スクリーンショットがアップロード済み
- [ ] アプリ説明文が記載済み

### Google Play（Android）

- [ ] Google Play Console Accountが有効（初回$25支払い済み）
- [ ] Play Consoleでアプリ登録済み
- [ ] Package名が一致: `com.slopelink.app`
- [ ] アプリ名が登録済み: `Slope Link`
- [ ] カテゴリが設定済み: ソーシャル
- [ ] コンテンツレーティングが設定済み
- [ ] データ安全性セクションが記入済み
- [ ] スクリーンショットがアップロード済み
- [ ] アプリ説明文が記載済み

## 📦 最終確認

- [ ] すべてのGit変更がコミットされている
- [ ] バージョン番号が正しい
- [ ] ビルドするブランチが正しい（main/master）
- [ ] チームメンバーに通知済み
- [ ] ビルド時間を確保している（15-30分）
- [ ] ビルド後のテスト計画がある
- [ ] ロールバック計画がある（問題が発生した場合）

---

## ✅ チェックリスト完了後

すべての項目にチェックが入ったら、以下のコマンドでビルドを開始できます：

### プレビュービルド（推奨：まずテスト用）

```bash
# Android
eas build --profile preview --platform android

# iOS
eas build --profile preview --platform ios

# 両方
eas build --profile preview --platform all
```

### 本番ビルド

```bash
# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios

# 両方
eas build --profile production --platform all
```

---

## 📋 ビルド後の確認事項

ビルドが完了したら：

- [ ] ビルドが成功したことを確認
- [ ] ビルドをダウンロード
- [ ] 実機にインストール
- [ ] 全機能をテスト
- [ ] クラッシュがないことを確認
- [ ] パフォーマンスが適切
- [ ] Sentryにエラーが報告されていないか確認
- [ ] Amplitudeにイベントが送信されているか確認

問題がなければ、ストアに提出できます！

---

## 📚 関連ドキュメント

- [本番ビルドガイド](./PRODUCTION_BUILD_GUIDE.md)
- [環境変数セットアップ](./ENVIRONMENT_SETUP.md)
- [ストア提出ガイド](./STORE_SUBMISSION.md)
- [通知システムガイド](./NOTIFICATIONS_README.md)
- [オフラインキャッシング](./OFFLINE_CACHING.md)
