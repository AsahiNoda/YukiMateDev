# 通知テストガイド / Notification Testing Guide

このガイドでは、Slope Linkアプリのプッシュ通知機能をテストする方法を説明します。

## 📋 目次

1. [通知の種類](#通知の種類)
2. [テスト環境の準備](#テスト環境の準備)
3. [ローカル通知のテスト](#ローカル通知のテスト)
4. [プッシュ通知のテスト](#プッシュ通知のテスト)
5. [実機でのテスト](#実機でのテスト)
6. [トラブルシューティング](#トラブルシューティング)

---

## 通知の種類

Slope Linkでは以下の6種類の通知が実装されています：

| 通知タイプ | トリガー | 送信先 | 実装場所 |
|-----------|---------|--------|---------|
| **event_application_approved** | イベント申請承認 | 申請者 | [notificationService.ts](../src/services/notificationService.ts:131-145) |
| **event_application_rejected** | イベント申請却下 | 申請者 | [notificationService.ts](../src/services/notificationService.ts:150-164) |
| **event_starting** | イベント開始リマインダー | 参加者全員 | [notificationService.ts](../src/services/notificationService.ts:169-184) |
| **event_cancelled** | イベントキャンセル | 参加者全員 | [notificationService.ts](../src/services/notificationService.ts:189-203) |
| **new_participant** | 新規参加者 | イベントホスト | [notificationService.ts](../src/services/notificationService.ts:208-223) |
| **post_event_action** | イベント終了6時間後 | 参加者全員 | [notificationService.ts](../src/services/notificationService.ts:228-242) |

---

## テスト環境の準備

### ❌ Expo Goでは通知をテストできません

**重要**: Expo Go（SDK 53以降）ではプッシュ通知が動作しません。

[useNotifications.ts](../src/hooks/useNotifications.ts:20-24)で自動的に無効化されています：

```typescript
if (Constants.appOwnership === 'expo') {
  console.log('⚠️  Push notifications disabled in Expo Go');
  return;
}
```

### ✅ テスト可能な環境

通知をテストするには、以下のいずれかが必要です：

1. **Development Build**（推奨）
   ```bash
   eas build --profile development --platform ios
   eas build --profile development --platform android
   ```

2. **Preview/Production Build**
   ```bash
   eas build --profile preview --platform ios
   eas build --profile preview --platform android
   ```

3. **実機でのローカルビルド**（iOSのみ）
   ```bash
   npx expo run:ios --device
   ```

### 必要な設定

#### iOS

- [ ] Apple Developer Account（有料、年間$99）
- [ ] 実機デバイス
- [ ] プロビジョニングプロファイル（EASが自動作成）
- [ ] 通知権限の許可

#### Android

- [ ] `google-services.json`ファイルが配置されている
- [ ] Firebase Cloud Messaging（FCM）が有効
- [ ] 実機またはエミュレーター（Google Play Services搭載）
- [ ] 通知権限の許可

⚠️ **現在の制限**: [notifications.ts](../src/utils/notifications.ts:23-26)でAndroidが一時的に無効化されています：

```typescript
if (Platform.OS === 'android') {
  console.warn('⚠️  Android push notifications require Firebase configuration');
  return undefined;
}
```

Firebase設定後、この部分を削除してください。

---

## ローカル通知のテスト

ローカル通知は、サーバーを経由せずにデバイス上で直接表示される通知です。最も簡単にテストできます。

### ステップ1: テスト用の画面を作成

プロジェクトのどこかにテストボタンを追加します（例: SettingsScreen）：

```typescript
import { sendLocalNotification, scheduleLocalNotification } from '@/utils/notifications';
import { Button } from '@/components/Button';

// テストボタンを追加
<Button
  title="テスト通知を送信"
  onPress={async () => {
    await sendLocalNotification(
      'テスト通知',
      'これはテスト通知です',
      { type: 'test', customData: 'test-123' }
    );
  }}
/>

<Button
  title="5秒後に通知"
  onPress={async () => {
    const notificationId = await scheduleLocalNotification(
      'スケジュール通知',
      '5秒後の通知です',
      5,
      { type: 'scheduled_test' }
    );
    console.log('通知スケジュール:', notificationId);
  }}
/>
```

### ステップ2: Development Buildで実行

```bash
# ビルド（初回のみ）
eas build --profile development --platform ios

# ビルドをインストール後、アプリを起動
npm start --dev-client

# テストボタンをタップ
```

### ステップ3: 通知の確認

1. **即座の通知**: ボタンをタップ後、すぐに通知が表示される
2. **スケジュール通知**: 5秒後に通知が表示される
3. **通知タップ**: 通知をタップするとアプリが開く

### 利用可能なローカル通知関数

[notifications.ts](../src/utils/notifications.ts:69-149)に以下の関数が実装されています：

```typescript
// 即座に通知を表示
await sendLocalNotification(title, body, data);

// 指定秒数後に通知
await scheduleLocalNotification(title, body, seconds, data);

// 特定の日時に通知
await scheduleNotificationAtTime(title, body, date, data);

// 通知をキャンセル
await cancelScheduledNotification(notificationId);

// すべての通知をキャンセル
await cancelAllScheduledNotifications();

// バッジをクリア
await clearNotificationBadge();
```

---

## プッシュ通知のテスト

プッシュ通知は、Supabase Edge Functionを経由してExpo Push Notification Serviceから送信されます。

### 前提条件

1. ✅ Supabase Edge Functionがデプロイ済み
2. ✅ Development/Preview Buildがインストール済み
3. ✅ 実機デバイスで実行中
4. ✅ 通知権限が許可されている

### ステップ1: Push Tokenの確認

アプリ起動時に、[useNotifications.ts](../src/hooks/useNotifications.ts:27-38)で自動的にPush Tokenが取得され、データベースに保存されます。

**ログで確認**:
```
✅ Push token取得成功: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
✅ 通知トークンを保存しました
```

**データベースで確認**:
```sql
-- Supabase SQL Editorで実行
SELECT * FROM notification_tokens
WHERE user_id = 'your-user-id';
```

### ステップ2: テスト通知の送信（方法1: アプリ内から）

実際のイベント操作で通知をトリガーします：

#### A. イベント申請承認通知

1. ユーザーAでイベントを作成
2. ユーザーBでイベントに申請
3. ユーザーAで申請を承認
4. ⇒ ユーザーBに「イベント申請が承認されました」通知が送信される

#### B. 新規参加者通知

1. ユーザーAでイベントを作成
2. ユーザーBがイベントに参加
3. ⇒ ユーザーAに「新しい参加者」通知が送信される

#### C. イベントキャンセル通知

1. イベントを作成して参加者を募集
2. イベントをキャンセル
3. ⇒ 全参加者に「イベントがキャンセルされました」通知が送信される

### ステップ3: テスト通知の送信（方法2: Supabase Functionsから直接）

Supabase Dashboardから直接Edge Functionを呼び出してテストできます。

#### Supabase Dashboard経由

1. Supabase Dashboard → Edge Functions → `send-notification`
2. 「Invoke Function」をクリック
3. 以下のJSONを入力：

```json
{
  "token": "ExponentPushToken[your-token-here]",
  "title": "テスト通知",
  "body": "これはSupabaseからのテスト通知です",
  "data": {
    "type": "test",
    "eventId": "test-event-123"
  }
}
```

4. 「Invoke」をクリック
5. ⇒ 実機に通知が届く

#### cURLコマンド経由

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "ExponentPushToken[your-token-here]",
    "title": "テスト通知",
    "body": "これはcURLからのテスト通知です",
    "data": {
      "type": "test"
    }
  }'
```

### ステップ4: Expo Push Notification Toolでテスト

Expoの公式ツールでも送信できます：

1. [Expo Push Notification Tool](https://expo.dev/notifications)にアクセス
2. Push Tokenを入力（`ExponentPushToken[...]`）
3. メッセージを入力：
   ```json
   {
     "to": "ExponentPushToken[your-token-here]",
     "title": "Expo Toolからのテスト",
     "body": "これはExpo Push Notification Toolからの通知です",
     "data": {
       "type": "event_application_approved",
       "eventId": "test-123"
     }
   }
   ```
4. 「Send a Notification」をクリック
5. ⇒ 実機に通知が届く

---

## 実機でのテスト

### iOS実機テスト

#### 必要なもの
- iPhone/iPad（iOS 13.4以上）
- Apple Developer Account
- Macコンピューター（ビルド用）

#### 手順

1. **Development Buildを作成**
   ```bash
   eas build --profile development --platform ios
   ```

2. **ビルドを実機にインストール**
   - EAS Dashboard からビルドをダウンロード
   - または、QRコードをスキャンして直接インストール

3. **アプリを起動**
   ```bash
   npm start --dev-client
   ```

4. **通知権限を許可**
   - アプリ起動時にプロンプトが表示される
   - 「Allow」をタップ

5. **Push Tokenを確認**
   - コンソールログで確認：
     ```
     ✅ Push token取得成功: ExponentPushToken[xxxxxx]
     ```

6. **テスト通知を送信**
   - 上記の方法でテスト

7. **通知タップのテスト**
   - 通知をタップ
   - アプリが開き、適切な画面に遷移するか確認
   - [useNotifications.ts](../src/hooks/useNotifications.ts:65-99)でハンドリング

### Android実機テスト

⚠️ **現在制限あり**: Firebase設定が必要です。

#### Firebase設定後の手順

1. **`google-services.json`を配置**
   ```
   yukimate/google-services.json
   ```

2. **[notifications.ts](../src/utils/notifications.ts:23-26)の制限を削除**
   ```typescript
   // この部分を削除またはコメントアウト
   // if (Platform.OS === 'android') {
   //   console.warn('⚠️  Android push notifications require Firebase...');
   //   return undefined;
   // }
   ```

3. **Development Buildを作成**
   ```bash
   eas build --profile development --platform android
   ```

4. **ビルドを実機にインストール**
   - APKをダウンロードして実機にインストール
   - または、`adb install app.apk`

5. **残りの手順はiOSと同じ**

---

## 通知タップ時の動作テスト

通知をタップした時の画面遷移をテストします。

### テストケース

| 通知タイプ | 期待される動作 | テスト方法 |
|-----------|--------------|----------|
| `event_application_approved` | イベント詳細画面を開く | 1. イベント申請を承認<br>2. 通知をタップ<br>3. イベント詳細画面が表示される |
| `event_application_rejected` | イベント詳細画面を開く | 同上 |
| `event_starting` | イベント詳細画面を開く | 1. Expo Toolでテスト通知送信<br>2. 通知をタップ<br>3. イベント詳細画面が表示される |
| `event_cancelled` | イベント詳細画面を開く | 同上 |
| `new_participant` | イベント詳細画面を開く | 同上 |
| `post_event_action` | イベント詳細画面を開く | 同上 |
| `chat_message` | イベントチャット画面を開く | 1. チャットメッセージを送信<br>2. 通知をタップ<br>3. チャット画面が表示される |

### 実装コード

[useNotifications.ts](../src/hooks/useNotifications.ts:65-99)で実装されています：

```typescript
const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
  const data = response.notification.request.content.data;

  switch (data.type) {
    case 'event_application_approved':
    case 'event_starting':
      router.push(`/event-detail?eventId=${data.eventId}`);
      break;

    case 'chat_message':
      router.push(`/event-chat?eventId=${data.eventId}`);
      break;

    // ...
  }
};
```

---

## スケジュール通知のテスト

イベント終了6時間後に送信される`post_event_action`通知をテストします。

### Supabase Edge Function: schedule-event-notifications

[supabase/functions/schedule-event-notifications](../../supabase/functions/schedule-event-notifications/)で実装されています。

#### Cronジョブの設定

Supabase Dashboardで設定：

1. Database → Cron Jobs
2. 「Create a new cron job」
3. 設定：
   ```sql
   -- 毎時実行
   SELECT cron.schedule(
     'schedule-event-notifications',
     '0 * * * *',
     $$
     SELECT net.http_post(
       url:='https://your-project.supabase.co/functions/v1/schedule-event-notifications',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     )
     $$
   );
   ```

#### 手動テスト

実際に6時間待たずにテストする方法：

1. **データベースで終了時刻を変更**
   ```sql
   -- テスト用のイベントの終了時刻を6時間前に変更
   UPDATE posts_events
   SET end_date = NOW() - INTERVAL '6 hours 1 minute'
   WHERE id = 'your-test-event-id';
   ```

2. **Edge Functionを手動実行**
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/schedule-event-notifications' \
     -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
     -H 'Content-Type: application/json'
   ```

3. **通知が送信されることを確認**

---

## トラブルシューティング

### 問題1: Push Tokenが取得できない

**症状**:
```
プッシュ通知は実機でのみ利用可能です
```

**原因**: エミュレーターで実行している

**解決策**: 実機でテストする

---

### 問題2: 「通知の権限が許可されませんでした」

**症状**:
```
通知の権限が許可されませんでした
```

**原因**: ユーザーが通知権限を拒否した

**解決策**:
1. iOS: 設定 → Slope Link → 通知 → 「通知を許可」をオン
2. Android: 設定 → アプリ → Slope Link → 通知 → 有効化
3. アプリを再起動

---

### 問題3: Expo Goで通知が動作しない

**症状**:
```
⚠️  Push notifications disabled in Expo Go
```

**原因**: Expo Go（SDK 53以降）では通知が非サポート

**解決策**: Development Buildを使用する
```bash
eas build --profile development --platform ios
```

---

### 問題4: Android で通知が動作しない

**症状**:
```
⚠️  Android push notifications require Firebase configuration
```

**原因**: Firebase（FCM）が未設定

**解決策**:
1. Firebase Consoleで`google-services.json`をダウンロード
2. プロジェクトルートに配置
3. [notifications.ts](../src/utils/notifications.ts:23-26)の制限コードを削除
4. アプリを再ビルド

---

### 問題5: 通知は届くがタップしても画面遷移しない

**症状**: 通知は表示されるが、タップしてもアプリが開かない

**原因**: `data`フィールドが正しく設定されていない

**解決策**: 通知送信時に必ず`data`を含める
```typescript
{
  "data": {
    "type": "event_application_approved",
    "eventId": "actual-event-id"
  }
}
```

---

### 問題6: Supabase Edge Functionでエラー

**症状**:
```
Failed to send notification: Invalid push token
```

**原因**:
- Push Tokenが無効
- データベースに古いトークンが残っている

**解決策**:
1. データベースの`notification_tokens`テーブルを確認
2. 古いトークンを削除
   ```sql
   DELETE FROM notification_tokens
   WHERE updated_at < NOW() - INTERVAL '30 days';
   ```
3. アプリを再起動してトークンを再取得

---

### 問題7: スケジュール通知が送信されない

**症状**: `post_event_action`通知が6時間後に届かない

**原因**:
- Cronジョブが未設定
- Edge Functionがエラー

**解決策**:
1. Supabase Dashboard → Database → Cron Jobsでジョブを確認
2. Edge Functionのログを確認
3. 手動でEdge Functionを実行してテスト

---

## テストチェックリスト

### 基本テスト

- [ ] ローカル通知が即座に表示される
- [ ] スケジュール通知が指定時間後に表示される
- [ ] 通知バッジが正しく表示される
- [ ] 通知音が鳴る
- [ ] 通知をタップするとアプリが開く

### 各通知タイプのテスト

- [ ] イベント申請承認通知が届く
- [ ] イベント申請却下通知が届く
- [ ] イベント開始リマインダーが届く
- [ ] イベントキャンセル通知が届く
- [ ] 新規参加者通知が届く（ホストのみ）
- [ ] イベント終了後の評価依頼通知が届く

### 画面遷移テスト

- [ ] イベント系通知 → イベント詳細画面に遷移
- [ ] チャット通知 → チャット画面に遷移
- [ ] `eventId`が正しく渡される
- [ ] 不正なデータでもクラッシュしない

### エッジケーステスト

- [ ] アプリがバックグラウンド時に通知が届く
- [ ] アプリが完全に終了している時に通知が届く
- [ ] 複数の通知が同時に届く
- [ ] ネットワークオフライン時の挙動
- [ ] 通知権限が拒否されている時の挙動

---

## 次のステップ

通知テストが完了したら：

1. ✅ すべての通知タイプをテスト
2. ✅ 画面遷移が正しいことを確認
3. ✅ エラーハンドリングを確認
4. ✅ ユーザーエクスペリエンスを評価
5. ✅ 本番環境でのテスト

---

## 関連ドキュメント

- [useNotifications.ts](../src/hooks/useNotifications.ts) - 通知フック
- [notifications.ts](../src/utils/notifications.ts) - 通知ユーティリティ
- [notificationService.ts](../src/services/notificationService.ts) - 通知サービス
- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
