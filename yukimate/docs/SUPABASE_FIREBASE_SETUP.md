# Supabase + Firebase プッシュ通知設定ガイド

このドキュメントでは、Supabase Edge FunctionでFirebase Cloud Messaging (FCM) HTTP v1 APIを使用してプッシュ通知を送信するための詳細な設定手順を説明します。

## ⚠️ 重要なセキュリティ注意事項

**絶対にやってはいけないこと:**
- Firebase サービスアカウントキーをGitにコミットする
- サービスアカウントキーをチャットやメールで共有する
- サービスアカウントキーをクライアントサイドのコードに含める
- ハードコードされたキーをソースコードに書く

**もしキーを誤って公開してしまった場合:**
1. 直ちにそのキーを無効化する
2. 新しいキーを生成する
3. 公開された場所からキーを削除する

---

## 前提条件

- [x] Firebase プロジェクトが作成済み
- [x] Supabase プロジェクトが作成済み
- [x] Supabase CLI がインストール済み (`npm install -g supabase`)

---

## 手順1: Firebase サービスアカウントキーの生成

### 1.1 Firebase Console でサービスアカウントキーを生成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 左上の⚙️アイコン → **「プロジェクトの設定」** をクリック
4. **「サービス アカウント」** タブをクリック
5. **「新しい秘密鍵の生成」** ボタンをクリック
6. **「キーを生成」** をクリック
7. JSONファイルがダウンロードされます（例: `slope-link-firebase-adminsdk-xxxxx.json`）

### 1.2 JSONファイルの内容確認

ダウンロードしたJSONファイルは以下のような構造になっています:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com"
}
```

⚠️ **このファイルを安全な場所に保管してください。Gitにコミットしないでください！**

---

## 手順2: Supabase プロジェクトの準備

### 2.1 Supabase CLI ログイン

```bash
# Supabase にログイン
supabase login

# ブラウザが開くので、Supabase アカウントでログイン
```

### 2.2 Supabase プロジェクトをリンク

```bash
cd c:/SnowMate/SnowMateDev/yukimate

# Supabase プロジェクトとリンク
supabase link --project-ref rmdpetmotoafaddkvyrk

# プロジェクトIDは Supabase Dashboard の URL から取得できます
# https://supabase.com/dashboard/project/YOUR-PROJECT-REF
```

---

## 手順3: 環境変数の設定

### 3.1 Firebase プロジェクトIDを設定

```bash
# Firebase プロジェクトID を設定
supabase secrets set FIREBASE_PROJECT_ID=your-firebase-project-id

# 例: supabase secrets set FIREBASE_PROJECT_ID=slope-link-12345
```

### 3.2 Firebase サービスアカウントキーを設定

**重要**: JSONファイル全体を文字列として設定します。

#### 方法1: ファイルから直接設定（推奨）

```bash
# JSONファイルの内容を環境変数として設定
supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="$(cat path/to/your-service-account-key.json)"

# 例（Windows）:
# supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="$(cat C:/Downloads/slope-link-firebase-adminsdk.json)"

# 例（Mac/Linux）:
# supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="$(cat ~/Downloads/slope-link-firebase-adminsdk.json)"
```

#### 方法2: Supabase Dashboard から設定

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左メニューから **「Edge Functions」** をクリック
4. 上部の **「Manage secrets」** または **「Settings」** をクリック
5. **「Add new secret」** をクリック
6. 以下を入力:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value**: JSONファイルの内容を**そのまま**コピー&ペースト（改行含む）
7. **「Save」** をクリック

同様に `FIREBASE_PROJECT_ID` も設定:
- **Name**: `FIREBASE_PROJECT_ID`
- **Value**: `your-firebase-project-id`

### 3.3 設定の確認

```bash
# 設定された環境変数を確認
supabase secrets list

# 出力例:
# FIREBASE_PROJECT_ID
# FIREBASE_SERVICE_ACCOUNT_KEY
```

⚠️ **注意**: 環境変数の値は表示されません（セキュリティのため）。名前のみ確認できます。

---

## 手順4: Edge Function のデプロイ

### 4.1 Edge Function の構造確認

```
yukimate/
└── supabase/
    └── functions/
        └── send-notification/
            └── index.ts
```

### 4.2 Edge Function をデプロイ

```bash
# send-notification 関数をデプロイ
supabase functions deploy send-notification

# デプロイが成功すると、以下のようなURLが表示されます:
# https://your-project-ref.supabase.co/functions/v1/send-notification
```

### 4.3 デプロイの確認

```bash
# デプロイされた関数の一覧を表示
supabase functions list

# 出力例:
# send-notification (deployed)
```

---

## 手順5: テスト

### 5.1 ローカルテスト（オプション）

```bash
# Edge Functions をローカルで実行
supabase functions serve send-notification --env-file .env.local

# .env.local ファイルに以下を記述:
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### 5.2 curlでテスト

```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test-device-fcm-token",
    "title": "テスト通知",
    "body": "これはテストメッセージです",
    "data": {
      "screen": "Home"
    }
  }'
```

**成功時のレスポンス:**
```json
{
  "success": true,
  "message": "Notification sent"
}
```

**エラー時のレスポンス:**
```json
{
  "error": "FCM error: ..."
}
```

### 5.3 アプリからテスト

Slope Link アプリで以下を実行:

1. アプリを起動してFCMトークンを取得
2. ログを確認: `[Notifications] FCM Token: xxxxx`
3. Supabase Database で以下のクエリを実行:

```sql
-- ユーザーのFCMトークンを確認
SELECT id, email, fcm_token FROM profiles WHERE id = 'your-user-id';

-- FCMトークンを更新（テスト用）
UPDATE profiles
SET fcm_token = 'your-device-fcm-token'
WHERE id = 'your-user-id';
```

4. Edge Function を呼び出してテスト通知を送信

---

## 手順6: アプリからの通知送信

### 6.1 イベント通知の例

Slope Link アプリでは、以下のタイミングで通知が送信されます:

1. **新しいイベントが作成されたとき**
2. **イベントに参加リクエストがあったとき**
3. **イベント参加が承認されたとき**
4. **イベントにメッセージが投稿されたとき**

### 6.2 通知送信コード例

```typescript
import { supabase } from '@/lib/supabase';

async function sendEventNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    // ユーザーのFCMトークンを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (!profile?.fcm_token) {
      console.log('FCM token not found for user:', userId);
      return;
    }

    // Edge Function を呼び出して通知を送信
    const { data: result, error } = await supabase.functions.invoke(
      'send-notification',
      {
        body: {
          fcmToken: profile.fcm_token,
          title,
          body,
          data,
        },
      }
    );

    if (error) {
      console.error('Failed to send notification:', error);
    } else {
      console.log('✅ Notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// 使用例:
await sendEventNotification(
  'user-123',
  '新しいイベント',
  'スノーボードイベントが作成されました！',
  { eventId: 'event-456', screen: 'EventDetail' }
);
```

---

## トラブルシューティング

### エラー1: "Firebase service account key not configured"

**原因**: `FIREBASE_SERVICE_ACCOUNT_KEY` が正しく設定されていない

**解決方法**:
```bash
# 環境変数を再設定
supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="$(cat path/to/service-account-key.json)"

# Edge Function を再デプロイ
supabase functions deploy send-notification
```

### エラー2: "Firebase project ID not configured"

**原因**: `FIREBASE_PROJECT_ID` が設定されていない

**解決方法**:
```bash
supabase secrets set FIREBASE_PROJECT_ID=your-project-id
supabase functions deploy send-notification
```

### エラー3: "FCM error: 401 Unauthorized"

**原因**: サービスアカウントキーが無効または権限が不足

**解決方法**:
1. Firebase Console でサービスアカウントキーを再生成
2. 新しいキーを Supabase に設定
3. Edge Function を再デプロイ

### エラー4: "FCM error: 404 Not Found"

**原因**: FCMトークンが無効または存在しない

**解決方法**:
1. アプリで新しいFCMトークンを取得
2. データベースの `fcm_token` を更新
3. 再度テスト

### エラー5: Edge Function がデプロイできない

**原因**: Supabase CLI の設定問題

**解決方法**:
```bash
# Supabase CLI を最新版に更新
npm update -g supabase

# プロジェクトを再リンク
supabase link --project-ref your-project-ref

# 再度デプロイ
supabase functions deploy send-notification
```

---

## セキュリティベストプラクティス

### ✅ やるべきこと

1. **環境変数を使用**: サービスアカウントキーは必ず環境変数で管理
2. **定期的なキーローテーション**: 3-6ヶ月ごとにキーを再生成
3. **最小権限の原則**: 必要最小限の権限のみを付与
4. **アクセスログの監視**: Firebase Console で API 使用状況を監視
5. **バックアップ**: サービスアカウントキーを安全な場所にバックアップ

### ❌ やってはいけないこと

1. **Git にコミット**: `.gitignore` に必ず追加
2. **クライアントサイドで使用**: サービスアカウントキーは絶対にクライアントに送信しない
3. **平文で保存**: ローカル環境でもパスワードマネージャーなどで暗号化
4. **チャット・メールで共有**: 公開された場合は即座に無効化
5. **ハードコード**: ソースコードに直接書かない

---

## Firebase Console でのモニタリング

### 使用状況の確認

1. [Firebase Console](https://console.firebase.google.com/) → プロジェクトを選択
2. 左メニュー → **「Cloud Messaging」**
3. **「使用状況」** タブで以下を確認:
   - 送信された通知数
   - 配信成功率
   - エラー率

### エラーログの確認

1. Firebase Console → **「Cloud Messaging」**
2. **「エラー」** タブでエラーログを確認
3. よくあるエラー:
   - `INVALID_ARGUMENT`: 無効なパラメータ
   - `UNREGISTERED`: FCMトークンが無効
   - `SENDER_ID_MISMATCH`: google-services.json の設定ミス

---

## 参考リンク

- [Firebase Cloud Messaging HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Firebase Service Account Authentication](https://firebase.google.com/docs/cloud-messaging/auth-server)

---

## 次のステップ

- [ ] Firebase サービスアカウントキーを生成
- [ ] Supabase に環境変数を設定
- [ ] Edge Function をデプロイ
- [ ] テスト通知を送信
- [ ] アプリに通知送信機能を統合
- [ ] プロダクション環境で動作確認

完了したら、[FIREBASE_SETUP.md](./FIREBASE_SETUP.md) と合わせて、完全なプッシュ通知システムが構築されます！
