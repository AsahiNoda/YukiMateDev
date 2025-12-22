# 本番ビルドガイド / Production Build Guide

このガイドでは、Slope Linkアプリの本番ビルドを作成してストアに提出するまでの手順を説明します。

## 📋 目次

1. [事前準備](#事前準備)
2. [EAS環境変数の設定](#eas環境変数の設定)
3. [ビルドプロファイル](#ビルドプロファイル)
4. [Androidビルド](#androidビルド)
5. [iOSビルド](#iosビルド)
6. [ビルドのテスト](#ビルドのテスト)
7. [ストア提出](#ストア提出)
8. [トラブルシューティング](#トラブルシューティング)

---

## 事前準備

### ✅ ビルド前チェックリスト

ビルドを開始する前に、以下の項目を確認してください：

- [ ] `.env`ファイルが正しく設定されている
- [ ] `EXPO_PUBLIC_SUPABASE_URL`と`EXPO_PUBLIC_SUPABASE_ANON_KEY`が設定済み
- [ ] EAS CLIがインストールされている（`eas --version`で確認）
- [ ] EASにログインしている（`eas whoami`で確認）
- [ ] `google-services.json`が存在する（Android用）
- [ ] プライバシーポリシーと利用規約が公開されている
- [ ] アプリのバージョン番号が正しい（[app.config.js](../app.config.js:5)）
- [ ] 全ての機能が動作することをローカルでテスト済み

### 必要なツール

```bash
# EAS CLIのインストール（未インストールの場合）
npm install -g eas-cli

# EASにログイン
eas login

# プロジェクトの確認
eas whoami
```

現在のログインユーザー: `asahi0855`
プロジェクトID: `a82327ee-4b50-4300-bafb-4e3e51b3ee98`

---

## EAS環境変数の設定

EASビルドで使用する環境変数を設定します。新しい`eas env`コマンドを使用します。

### ステップ1: 環境変数の作成

```bash
# Supabase URL（必須）
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://rmdpetmotoafaddkvyrk.supabase.co"

# Supabase Anon Key（必須）
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_supabase_anon_key_here"

# Sentry DSN（オプション - 本番環境では推奨）
eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value "your_sentry_dsn_here"

# Amplitude API Key（オプション - 本番環境では推奨）
eas env:create --name EXPO_PUBLIC_AMPLITUDE_API_KEY --value "your_amplitude_api_key_here"
```

### ステップ2: 環境変数の確認

```bash
eas env:list
```

出力例：
```
Environment variables for @asahi0855/slopelink:
┌────────────────────────────────────┬─────────────┬─────────┐
│ Name                                │ Environments│ Updated │
├────────────────────────────────────┼─────────────┼─────────┤
│ EXPO_PUBLIC_SUPABASE_URL           │ production  │ 1h ago  │
│ EXPO_PUBLIC_SUPABASE_ANON_KEY      │ production  │ 1h ago  │
│ EXPO_PUBLIC_SENTRY_DSN             │ production  │ 1h ago  │
│ EXPO_PUBLIC_AMPLITUDE_API_KEY      │ production  │ 1h ago  │
└────────────────────────────────────┴─────────────┴─────────┘
```

### ステップ3: 特定の環境に変数を紐付け（必要に応じて）

```bash
# 特定の環境（preview/production）にのみ変数を適用
eas env:link --environment preview --variable EXPO_PUBLIC_SUPABASE_URL
eas env:link --environment production --variable EXPO_PUBLIC_SUPABASE_URL
```

---

## ビルドプロファイル

[eas.json](../eas.json)には3つのビルドプロファイルが定義されています：

### 1. Development（開発用）
```json
{
  "developmentClient": true,
  "distribution": "internal",
  "ios": { "simulator": true },
  "android": { "buildType": "apk" }
}
```

**用途**: 開発中のテスト用
**配布**: 内部配布のみ
**iOS**: シミュレーターで実行可能
**Android**: APK形式

### 2. Preview（プレビュー/テスト用）
```json
{
  "distribution": "internal",
  "ios": { "simulator": false },
  "android": { "buildType": "apk" }
}
```

**用途**: 内部テスト、ベータテスト
**配布**: 内部配布（Ad-hoc）
**iOS**: 実機のみ
**Android**: APK形式（簡単にインストール可能）

### 3. Production（本番用）
```json
{
  "distribution": "store",
  "ios": { "simulator": false },
  "android": { "buildType": "app-bundle" }
}
```

**用途**: ストア配信用
**配布**: App Store / Google Play
**iOS**: 実機のみ
**Android**: AAB形式（Google Play要件）

---

## Androidビルド

### 開発ビルド

```bash
eas build --profile development --platform android
```

### プレビュービルド（推奨：まずこれでテスト）

```bash
eas build --profile preview --platform android
```

**所要時間**: 約10-20分
**出力**: APKファイル
**テスト方法**:
1. ビルド完了後、Expo Dashboardでビルド詳細を確認
2. APKをダウンロード
3. Androidデバイスにインストール（`adb install app.apk`）
4. アプリを起動してすべての機能をテスト

### 本番ビルド（ストア提出用）

```bash
eas build --profile production --platform android
```

**所要時間**: 約10-20分
**出力**: AAB（Android App Bundle）
**次のステップ**: Google Play Consoleにアップロード

### Androidビルドの注意点

1. **google-services.jsonが必要**
   - Firebase設定ファイル
   - [app.config.js](../app.config.js:29)で参照されている
   - プロジェクトルートに配置

2. **パッケージ名**: `com.slopelink.app`
   - [app.config.js](../app.config.js:28)で定義
   - Google Play Consoleで使用

3. **権限**
   - カメラ
   - ストレージ読み書き
   - 通知
   - 詳細は[app.config.js](../app.config.js:30-36)参照

---

## iOSビルド

### プレビュービルド

```bash
eas build --profile preview --platform ios
```

**所要時間**: 約15-30分
**出力**: IPA（内部配布用）
**テスト方法**:
1. TestFlightまたはAd-hoc配布
2. ビルド完了後のリンクから実機にインストール
3. すべての機能をテスト

### 本番ビルド（ストア提出用）

```bash
eas build --profile production --platform ios
```

**所要時間**: 約15-30分
**出力**: IPA（App Store配布用）
**次のステップ**: App Store Connectにアップロード

### iOSビルドの注意点

1. **Apple Developer Accountが必要**
   - 有料アカウント（年間$99）
   - EASが自動で証明書を管理

2. **Bundle ID**: `com.slopelink.app`
   - [app.config.js](../app.config.js:13)で定義
   - App Store Connectで使用

3. **権限の説明文**
   - カメラ: プロフィール写真やイベント写真の撮影
   - フォトライブラリ: 写真の選択
   - 詳細は[app.config.js](../app.config.js:14-17)参照

4. **初回ビルド時**
   - Apple Developer Portalへのアクセス許可が必要
   - EASが証明書とプロビジョニングプロファイルを自動作成

---

## ビルドのテスト

### Androidテスト手順

1. **APKのダウンロード**
   ```bash
   # ビルド完了後、Expo DashboardからAPKをダウンロード
   # または、コマンドでダウンロードリンクを取得
   eas build:list --platform android --limit 1
   ```

2. **実機にインストール**
   ```bash
   # USBデバッグを有効にしてデバイスを接続
   adb install path/to/app.apk
   ```

3. **テスト項目**
   - [ ] ログイン/ログアウト
   - [ ] イベント作成・参加
   - [ ] チャット機能
   - [ ] プッシュ通知
   - [ ] 画像アップロード
   - [ ] オフライン機能
   - [ ] 天気情報の取得
   - [ ] Snowfeed（投稿・コメント）
   - [ ] プロフィール編集
   - [ ] 設定変更

### iOSテスト手順

1. **TestFlightでの配布**
   ```bash
   # ビルド完了後、TestFlightに自動アップロード（設定による）
   # または、手動でApp Store Connectにアップロード
   eas submit --platform ios
   ```

2. **テスター招待**
   - App Store Connectでテスターを追加
   - 内部テスター（最大100人）
   - 外部テスター（審査が必要）

3. **テスト項目**
   - Androidと同じ項目をテスト
   - 追加: Face ID/Touch ID（該当する場合）
   - 追加: iOS固有のUI確認

### パフォーマンステスト

```bash
# メモリ使用量の確認（Android）
adb shell dumpsys meminfo com.slopelink.app

# CPU使用率の確認
# Android Studio Profilerを使用
# または Xcode Instrumentsを使用（iOS）
```

---

## ストア提出

### Google Play Store

#### ステップ1: Play Consoleでアプリ登録

1. [Google Play Console](https://play.google.com/console)にアクセス
2. 「アプリを作成」をクリック
3. アプリ名: **Slope Link**
4. デフォルト言語: **日本語**
5. アプリケーションタイプ: **アプリ**
6. 無料/有料: **無料**

#### ステップ2: ストアページの設定

必要な情報：
- [ ] アプリ名: Slope Link
- [ ] 簡単な説明（80文字以内）
- [ ] 詳細な説明（4000文字以内）
- [ ] アプリアイコン（512x512 PNG）
- [ ] フィーチャーグラフィック（1024x500 JPG/PNG）
- [ ] スクリーンショット
  - 携帯電話: 最低2枚（16:9または9:16）
  - 7インチタブレット: 推奨
  - 10インチタブレット: 推奨

#### ステップ3: コンテンツレーティング

- カテゴリ: **ソーシャル**
- レーティング設定
  - ユーザー生成コンテンツ: はい
  - ユーザー間の通信: はい
  - 個人情報の共有: はい

#### ステップ4: プライバシーポリシー

- プライバシーポリシーURL: **必須**
- データ安全性セクションの記入
  - 収集データ: プロフィール情報、位置情報、写真
  - データ使用目的: アプリ機能、分析
  - データ共有: なし（または該当する場合記載）

#### ステップ5: AABのアップロード

```bash
# EAS経由で直接提出
eas submit --platform android --profile production

# または、手動でPlay Consoleにアップロード
# 1. eas build --profile production --platform android
# 2. ビルド完了後、AABをダウンロード
# 3. Play Console > リリース > 本番環境 > 新しいリリース作成
# 4. AABをアップロード
```

#### ステップ6: リリース設定

- リリーストラック: **本番環境**
- または最初は**内部テスト**→**クローズドテスト**→**オープンテスト**→**本番環境**の順に進める
- リリースノート（各言語）

#### ステップ7: 審査送信

- すべての項目を記入
- 「審査に送信」をクリック
- 審査期間: 通常1-3日

---

### Apple App Store

#### ステップ1: App Store Connectでアプリ登録

1. [App Store Connect](https://appstoreconnect.apple.com/)にアクセス
2. 「マイApp」→「+」→「新規App」
3. プラットフォーム: **iOS**
4. 名前: **Slope Link**
5. 言語: **日本語**
6. バンドルID: **com.slopelink.app**
7. SKU: **slopelink-001**（任意の一意な値）

#### ステップ2: アプリ情報

- [ ] カテゴリ: **ソーシャルネットワーキング**
- [ ] サブカテゴリ: **スポーツ**（任意）
- [ ] コンテンツ権利情報
  - 著作権: **© 2025 Slope Link**

#### ステップ3: 価格と配信可能状況

- 価格: **無料**
- 配信可能地域: **日本**（または全世界）

#### ステップ4: アプリのプライバシー

App Storeのプライバシー質問票に回答：
- [ ] データの収集: はい
  - アカウント情報（メールアドレス、名前）
  - 位置情報（イベント作成時）
  - 写真（プロフィール、投稿）
  - 使用状況データ（分析用）
- [ ] データの使用目的
  - アプリ機能
  - 分析
  - 製品のパーソナライゼーション
- [ ] プライバシーポリシーURL: **必須**

#### ステップ5: App Store向けアセット

必要な素材：
- [ ] アプリアイコン（1024x1024 PNG）
  - すでに[assets/images/icon.png](../assets/images/icon.png)に存在
- [ ] スクリーンショット（iPhone）
  - 6.7インチ（iPhone 15 Pro Max）: 最低2枚必須
  - 6.5インチ（iPhone 11 Pro Max等）: 推奨
  - サイズ: 1290x2796または1242x2688
- [ ] スクリーンショット（iPad）: 推奨
  - 12.9インチ: 2048x2732
- [ ] アプリプレビュー動画（任意）: 15-30秒

#### ステップ6: アプリの説明

- **名前**: Slope Link
- **サブタイトル**（30文字以内）:
  ```
  スキー・スノボ仲間を見つけよう
  ```

- **説明**（4000文字以内）:
  ```
  Slope Linkは、スキーとスノーボード愛好家のためのソーシャルネットワークアプリです。

  【主な機能】
  • イベント作成・参加: 一緒に滑りに行く仲間を募集
  • リアルタイムチャット: イベント参加者とのグループチャット
  • Snowfeed: 滑走の思い出や情報を写真で共有
  • 天気情報: リゾートの天気と雪質情報
  • プロフィール管理: スキルレベルやギア情報を共有

  【こんな人におすすめ】
  • スキー・スノボ仲間を探している
  • 新しいゲレンデに挑戦したい
  • 滑走記録を共有したい
  • 同じレベルの仲間と滑りたい

  さあ、Slope Linkで最高のスノーライフを！
  ```

- **キーワード**（100文字以内）:
  ```
  スキー,スノーボード,ゲレンデ,スノボ,雪山,リゾート,仲間,ソーシャル,イベント,チャット
  ```

- **サポートURL**: あなたのサポートページURL
- **マーケティングURL**（任意）: アプリのウェブサイト

#### ステップ7: ビルドのアップロード

```bash
# EAS経由で直接提出
eas submit --platform ios --profile production

# または、手動でXcodeを使用
# 1. eas build --profile production --platform ios
# 2. ビルド完了後、IPAをダウンロード
# 3. Transporter（Appleの公式アプリ）でアップロード
```

#### ステップ8: App審査情報

- [ ] デモアカウント情報（必須）
  - ユーザー名: テストアカウントのメール
  - パスワード: テストアカウントのパスワード
  - 補足説明: 「このアカウントで全機能をテストできます」

- [ ] 連絡先情報
  - 名前
  - 電話番号
  - メールアドレス

- [ ] 注意事項
  - プッシュ通知のテスト方法
  - 特定の機能の使い方（必要に応じて）

#### ステップ9: コンテンツレーティング

- 年齢レーティング: **12+**（推奨）
  - 理由: ユーザー生成コンテンツ、ソーシャル機能

#### ステップ10: 審査に送信

- すべての項目を記入
- 「審査に送信」をクリック
- 審査期間: 通常1-3日（初回は最大1週間）

---

## トラブルシューティング

### ビルドエラー: 環境変数が見つからない

**エラー**:
```
Error: Supabase URL and Anon Key are required
```

**解決策**:
```bash
# 環境変数が設定されているか確認
eas env:list

# 未設定の場合は作成
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "your_url"
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_key"
```

### ビルドエラー: google-services.json not found

**エラー**:
```
ENOENT: no such file or directory, open 'google-services.json'
```

**解決策**:
1. Firebaseコンソールから`google-services.json`をダウンロード
2. プロジェクトルート（yukimate/）に配置
3. `.gitignore`で除外されているか確認（セキュリティのため）

### iOSビルドエラー: 証明書の問題

**エラー**:
```
No valid code signing certificate found
```

**解決策**:
```bash
# EASに証明書管理を任せる
eas build --profile production --platform ios

# プロンプトで「Yes」を選択してEASに証明書を管理させる
```

### App審査で却下される場合

#### 理由1: デモアカウントが動作しない

**解決策**:
- 有効なテストアカウントを提供
- パスワードが正しいか確認
- アカウントがロックされていないか確認

#### 理由2: プライバシーポリシーがない/不十分

**解決策**:
- プライバシーポリシーを作成・公開
- 収集するデータと使用目的を明記
- Supabase、Sentry、Amplitudeの使用を説明

#### 理由3: アプリがクラッシュする

**解決策**:
- Sentryでクラッシュログを確認
- TestFlightで十分にテスト
- 本番ビルドで全機能をテスト

#### 理由4: ガイドライン違反

**解決策**:
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)を確認
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)を確認
- ユーザー生成コンテンツの報告機能を実装（必要に応じて）

### ビルドが遅い

**原因**:
- EASサーバーの混雑
- 依存関係のダウンロードに時間がかかっている

**解決策**:
- Priority buildを使用（有料プラン）
- キャッシュが有効か確認
- 不要な依存関係を削除

### ビルドが失敗する: メモリ不足

**エラー**:
```
FATAL ERROR: Reached heap limit Allocation failed
```

**解決策**:
```json
// metro.config.js または eas.json に設定を追加
{
  "build": {
    "production": {
      "node": "20.x",
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=4096"
      }
    }
  }
}
```

---

## ビルドコマンド早見表

```bash
# ローカル開発
npm start

# 環境変数の設定
eas env:create --name VAR_NAME --value "value"
eas env:list
eas env:update --name VAR_NAME --value "new_value"
eas env:delete --name VAR_NAME

# ビルド（Android）
eas build --profile development --platform android  # 開発用APK
eas build --profile preview --platform android      # テスト用APK
eas build --profile production --platform android   # 本番用AAB

# ビルド（iOS）
eas build --profile development --platform ios      # 開発用
eas build --profile preview --platform ios          # テスト用IPA
eas build --profile production --platform ios       # 本番用IPA

# 両プラットフォーム同時ビルド
eas build --profile production --platform all

# ストア提出
eas submit --platform android --profile production
eas submit --platform ios --profile production

# ビルド履歴の確認
eas build:list
eas build:view [BUILD_ID]

# ビルドのキャンセル
eas build:cancel [BUILD_ID]
```

---

## 次のステップ

1. ✅ 環境変数をEASに設定
2. ✅ プレビュービルドを作成してテスト
3. ✅ TestFlightとInternal Testingでベータテスト
4. ✅ フィードバックを反映
5. ✅ 本番ビルドを作成
6. ✅ ストアページを準備
7. ✅ 審査に送信
8. ✅ 審査通過後にリリース

---

## 関連ドキュメント

- [EAS Buildドキュメント](https://docs.expo.dev/build/introduction/)
- [EAS Submitドキュメント](https://docs.expo.dev/submit/introduction/)
- [App Store Connectヘルプ](https://developer.apple.com/help/app-store-connect/)
- [Google Play Consoleヘルプ](https://support.google.com/googleplay/android-developer/)
- [環境変数セットアップガイド](./ENVIRONMENT_SETUP.md)
- [ストア提出ガイド](./STORE_SUBMISSION.md)
