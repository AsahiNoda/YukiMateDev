# 通知機能実装ガイド

## 概要

YukiMateアプリに実装されたプッシュ通知機能のドキュメントです。

## 実装済み通知機能

### 1. イベント申請関連の通知

#### 申請承認通知
- **タイミング**: ホストが参加申請を承認したとき
- **送信先**: 申請者
- **実装箇所**: [useEventApplications.ts](src/hooks/useEventApplications.ts:214-219)

#### 申請却下通知
- **タイミング**: ホストが参加申請を却下したとき
- **送信先**: 申請者
- **実装箇所**: [useEventApplications.ts](src/hooks/useEventApplications.ts:243-250)

### 2. イベント終了後の通知

#### PostEventAction通知（イベント終了6時間後）
- **タイミング**: イベント終了から6時間後
- **送信先**: 全参加者
- **実装方法**: Supabase Edge Function（スケジューラー）
- **実装箇所**: [schedule-event-notifications/index.ts](../supabase/functions/schedule-event-notifications/index.ts)

### 3. その他のイベント通知

以下の通知関数も実装済みです（使用箇所は必要に応じて追加してください）：

- **イベント開始30分前のリマインダー**: `scheduleEventStartReminder()`
- **イベントキャンセル通知**: `notifyEventCancellation()`
- **新規参加者通知（ホスト向け）**: `notifyHostOfNewParticipant()`

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                     React Native App                     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ useNotifications Hook (RootLayout.tsx)          │   │
│  │ - プッシュトークンの取得と保存                  │   │
│  │ - 通知受信リスナーの設定                        │   │
│  │ - 通知タップ時の画面遷移処理                    │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ notificationService.ts                          │   │
│  │ - トークン管理（保存/取得/削除）                │   │
│  │ - 各種通知送信関数                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Supabase Backend                      │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ notification_tokens テーブル                    │   │
│  │ - ユーザーIDとプッシュトークンを保存            │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Edge Function: send-notification                │   │
│  │ - Expo Push API経由で通知を送信                 │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Edge Function: schedule-event-notifications     │   │
│  │ - Cron Job（毎時実行）                          │   │
│  │ - 6時間前に終了したイベントを検出               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Expo Push Notification Service              │
└─────────────────────────────────────────────────────────┘
```

## セットアップ手順

### 1. データベースマイグレーション

Supabaseにnotification_tokensテーブルを作成します：

```bash
# Supabaseプロジェクトにログイン
supabase login

# マイグレーションを適用
supabase db push
```

または、Supabase Dashboardから以下のSQLを実行：

```sql
-- supabase/migrations/20251211_create_notification_tokens.sql の内容を実行
```

### 2. Edge Functionのデプロイ

```bash
# send-notification関数をデプロイ
supabase functions deploy send-notification

# schedule-event-notifications関数をデプロイ
supabase functions deploy schedule-event-notifications
```

### 3. Cron Jobの設定（PostEventAction通知用）

Supabase Dashboardで以下のCron Jobを設定：

```sql
-- 毎時0分に実行
SELECT cron.schedule(
  'schedule-event-notifications-hourly',
  '0 * * * *',  -- 毎時0分
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/schedule-event-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

**注意**: `YOUR_PROJECT_REF`と`YOUR_ANON_KEY`を実際の値に置き換えてください。

### 4. アプリの再ビルド

通知プラグインを有効にするため、アプリを再ビルドします：

```bash
# 開発ビルド
npx expo run:ios
# または
npx expo run:android

# プロダクションビルド（EAS Build使用時）
eas build --platform ios
eas build --platform android
```

## 使用方法

### 既存のコードに通知を追加する例

#### 例1: イベント参加時にホストへ通知

```typescript
import { notifyHostOfNewParticipant } from '@/services/eventNotificationService';

// イベント参加処理の後に追加
async function joinEvent(eventId: string, eventTitle: string) {
  // ... 参加処理 ...

  // 現在のユーザーIDを取得
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // ホストに通知
    await notifyHostOfNewParticipant(eventId, eventTitle, user.id);
  }
}
```

#### 例2: イベント開始30分前のリマインダー

```typescript
import { scheduleReminderOnJoin } from '@/services/eventNotificationService';

// イベント参加承認時にリマインダーをスケジュール
async function approveApplication(applicationId: string, eventId: string, applicantUserId: string) {
  // ... 承認処理 ...

  // イベント情報を取得
  const { data: event } = await supabase
    .from('posts_events')
    .select('title, start_at')
    .eq('id', eventId)
    .single();

  if (event) {
    // リマインダーをスケジュール
    await scheduleReminderOnJoin(
      applicantUserId,
      eventId,
      event.title,
      event.start_at
    );
  }
}
```

## ファイル構成

```
yukimate/
├── src/
│   ├── utils/
│   │   └── notifications.ts              # 通知ユーティリティ関数
│   ├── hooks/
│   │   └── useNotifications.ts           # 通知フック（初期化・リスナー）
│   ├── services/
│   │   ├── notificationService.ts        # 通知送信サービス
│   │   └── eventNotificationService.ts   # イベント関連通知サービス
│   └── navigation/
│       └── RootLayout.tsx                # 通知フックの統合

supabase/
├── migrations/
│   └── 20251211_create_notification_tokens.sql  # DBスキーマ
└── functions/
    ├── send-notification/
    │   └── index.ts                      # 通知送信Edge Function
    └── schedule-event-notifications/
        └── index.ts                      # スケジューラーEdge Function
```

## 通知タイプ一覧

| タイプ | 説明 | データ構造 |
|--------|------|-----------|
| `event_application_approved` | イベント申請承認 | `{ eventId: string }` |
| `event_application_rejected` | イベント申請却下 | `{ eventId: string }` |
| `event_starting` | イベント開始30分前 | `{ eventId: string }` |
| `event_cancelled` | イベントキャンセル | `{ eventId: string }` |
| `new_participant` | 新規参加者（ホスト向け） | `{ eventId: string }` |
| `post_event_action` | イベント評価依頼（6時間後） | `{ eventId: string }` |

## トラブルシューティング

### 通知が届かない場合

1. **実機でテストしているか確認**
   - プッシュ通知はシミュレーターでは動作しません

2. **通知トークンが保存されているか確認**
   ```sql
   SELECT * FROM notification_tokens WHERE user_id = 'YOUR_USER_ID';
   ```

3. **通知権限が許可されているか確認**
   - iOS: 設定 > YukiMate > 通知
   - Android: 設定 > アプリ > YukiMate > 通知

4. **Edge Functionのログを確認**
   ```bash
   supabase functions logs send-notification
   supabase functions logs schedule-event-notifications
   ```

### Edge Functionのテスト

```bash
# send-notification関数のテスト
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "ExponentPushToken[xxxxxx]",
    "title": "テスト通知",
    "body": "これはテストです",
    "data": { "type": "test" }
  }'
```

## 今後の拡張

以下の通知機能を追加することをお勧めします：

1. **チャットメッセージ通知**
   - イベントチャットに新しいメッセージが投稿されたとき

2. **★登録通知**
   - 他のユーザーが自分を★登録したとき

3. **新雪アラート**
   - お気に入りのスキー場に新雪が降ったとき

4. **カスタム通知設定**
   - ユーザーが受け取る通知を選択できる機能

## 参考リンク

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
