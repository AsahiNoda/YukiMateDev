# 環境変数セットアップガイド / Environment Variables Setup Guide

このドキュメントでは、Slope Linkアプリの環境変数の設定方法を説明します。

## 📋 目次

1. [ローカル開発環境](#ローカル開発環境)
2. [本番環境（EAS Secrets）](#本番環境eas-secrets)
3. [オプション設定](#オプション設定)
4. [トラブルシューティング](#トラブルシューティング)

---

## ローカル開発環境

### ステップ1: .envファイルの確認

`.env`ファイルはすでに存在し、以下の必須項目が設定されています：

```env
EXPO_PUBLIC_SUPABASE_URL=https://rmdpetmotoafaddkvyrk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **これらの値は既に正しく設定されています。**

### ステップ2: 動作確認

アプリを起動して、Supabase接続をテストします：

```bash
npm start
```

もしエラーが出る場合は、[src/lib/supabase.ts](../src/lib/supabase.ts:11-14)で詳細なエラーメッセージが表示されます。

---

## 本番環境（EAS Secrets）

EASビルドとストア配信用に、環境変数を**EAS Secrets**として設定する必要があります。

### ステップ1: EAS CLIのインストール

```bash
npm install -g eas-cli
```

### ステップ2: EASにログイン

```bash
eas login
```

### ステップ3: 必須のSecretsを設定

以下のコマンドで環境変数をEASに登録します：

```bash
# Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://rmdpetmotoafaddkvyrk.supabase.co" --type string

# Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZHBldG1vdG9hZmFkZGt2eXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDc1NzEsImV4cCI6MjA3NDgyMzU3MX0.oaY0nv82XIG8OvHF7Z0q2cYdJFB74s1I-ys00Ab7lp8" --type string
```

### ステップ4: Secretsの確認

設定されたSecretsを確認：

```bash
eas secret:list
```

出力例：
```
┌────────────────────────────────────┬────────┬─────────┐
│ Name                                │ Scope  │ Updated │
├────────────────────────────────────┼────────┼─────────┤
│ EXPO_PUBLIC_SUPABASE_URL           │ project│ 1d ago  │
│ EXPO_PUBLIC_SUPABASE_ANON_KEY      │ project│ 1d ago  │
└────────────────────────────────────┴────────┴─────────┘
```

---

## オプション設定

以下の設定は任意ですが、本番環境では強く推奨されます。

### 1. Sentry（エラートラッキング）

#### Sentryプロジェクトの作成

1. [Sentry.io](https://sentry.io/)でアカウント作成
2. 新しいプロジェクトを作成（React Native）
3. DSN（Data Source Name）をコピー

#### ローカル環境に追加

`.env`ファイルを編集：

```env
EXPO_PUBLIC_SENTRY_DSN=https://your_sentry_dsn@sentry.io/your_project_id
```

#### EAS Secretsに追加

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://your_sentry_dsn@sentry.io/your_project_id" --type string
```

#### 実装状況

Sentryは既に[src/lib/sentry.ts](../src/lib/sentry.ts)で実装済みです。DSNを設定するだけで自動的に有効化されます。

### 2. Amplitude（アナリティクス）

#### Amplitudeプロジェクトの作成

1. [Amplitude Analytics](https://analytics.amplitude.com/)でアカウント作成
2. 新しいプロジェクトを作成
3. API Keyをコピー

#### ローカル環境に追加

`.env`ファイルを編集：

```env
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key_here
```

#### EAS Secretsに追加

```bash
eas secret:create --scope project --name EXPO_PUBLIC_AMPLITUDE_API_KEY --value "your_amplitude_api_key_here" --type string
```

#### 実装状況

Amplitudeは既に[src/lib/analytics.ts](../src/lib/analytics.ts)で実装済みです。API Keyを設定するだけで自動的に有効化されます。

---

## 環境変数の確認方法

### アプリ内での確認

環境変数が正しく読み込まれているか確認するには、[src/lib/supabase.ts](../src/lib/supabase.ts:6-14)を参照してください。

```typescript
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required...');
}
```

アプリ起動時にこのエラーが出なければ、環境変数は正しく設定されています。

---

## トラブルシューティング

### 問題1: 「Supabase URL and Anon Key are required」エラー

**原因**: 環境変数が読み込まれていない

**解決策**:
1. `.env`ファイルが`yukimate/`ディレクトリ直下にあることを確認
2. 変数名が`EXPO_PUBLIC_`で始まっていることを確認
3. アプリを完全に再起動（Metro Bundlerも含めて）

```bash
# Metro Bundlerのキャッシュをクリア
npm start -- --clear
```

### 問題2: EASビルドで環境変数が読み込まれない

**原因**: EAS Secretsが設定されていない

**解決策**:
1. `eas secret:list`で設定を確認
2. 未設定の場合は上記のコマンドで追加
3. ビルドを再実行

```bash
eas build --profile production --platform ios
```

### 問題3: Sentryにエラーが送信されない

**原因**: DSNが設定されていない、または無効

**解決策**:
1. `.env`ファイルで`EXPO_PUBLIC_SENTRY_DSN`がコメントアウトされていないか確認
2. Sentryダッシュボードでプロジェクトが有効か確認
3. [src/lib/sentry.ts](../src/lib/sentry.ts)で初期化コードを確認

### 問題4: Amplitudeにイベントが送信されない

**原因**: API Keyが設定されていない、または無効

**解決策**:
1. `.env`ファイルで`EXPO_PUBLIC_AMPLITUDE_API_KEY`が設定されているか確認
2. Amplitudeダッシュボードで正しいAPI Keyか確認
3. [src/lib/analytics.ts](../src/lib/analytics.ts)で初期化コードを確認

---

## 環境変数一覧

| 変数名 | 必須/任意 | 用途 | 設定場所 |
|--------|----------|------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ 必須 | Supabase接続URL | `.env` + EAS Secrets |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ 必須 | Supabase匿名キー | `.env` + EAS Secrets |
| `EXPO_PUBLIC_SENTRY_DSN` | ⚪ 任意 | エラートラッキング | `.env` + EAS Secrets |
| `EXPO_PUBLIC_AMPLITUDE_API_KEY` | ⚪ 任意 | アナリティクス | `.env` + EAS Secrets |

---

## 次のステップ

環境変数の設定が完了したら：

1. ✅ ローカルでアプリを起動して動作確認
2. ✅ EAS Secretsを設定
3. ✅ 開発ビルドでテスト
4. ✅ 本番ビルドを作成
5. ✅ ストアに提出

詳細は[STORE_SUBMISSION.md](./STORE_SUBMISSION.md)を参照してください。

---

## 関連ドキュメント

- [Expo環境変数ガイド](https://docs.expo.dev/guides/environment-variables/)
- [EAS Secretsドキュメント](https://docs.expo.dev/build-reference/variables/)
- [Supabaseドキュメント](https://supabase.com/docs)
- [Sentryドキュメント](https://docs.sentry.io/platforms/react-native/)
- [Amplitudeドキュメント](https://www.docs.developers.amplitude.com/data/sdks/typescript-react-native/)
