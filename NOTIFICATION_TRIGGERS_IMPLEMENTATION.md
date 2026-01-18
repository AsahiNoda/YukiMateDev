# 通知トリガー実装ガイド

## 概要
このドキュメントでは、SnowMateアプリの全通知機能とそのトリガーポイントを説明します。

## 実装状況

### ✅ 実装済み通知

#### 1. イベント申請の通知
**トリガーポイント**: [useEventApplications.ts:214-218](yukimate/src/hooks/useEventApplications.ts#L214-L218)

- **承認通知** (`notifyEventApplicationApproved`)
  - 申請が承認されたときに申請者に送信
  - 実装場所: `useEventApplications.approveApplication()`

- **却下通知** (`notifyEventApplicationRejected`)
  - 申請が却下されたときに申請者に送信
  - 実装場所: [useEventApplications.ts:244-250](yukimate/src/hooks/useEventApplications.ts#L244-L250)

#### 2. 新規申請通知
**トリガーポイント**: [useDiscoverEvents.ts:366-392](yukimate/src/hooks/useDiscoverEvents.ts#L366-L392)

- **新規申請通知** (`notifyNewApplication`)
  - ユーザーがイベントに申請したときにホストに送信
  - 実装場所: `applyToEvent()`

#### 3. 新規参加者通知
**トリガーポイント**: [useEventApplications.ts:220-222](yukimate/src/hooks/useEventApplications.ts#L220-L222)

- **新規参加者通知** (`notifyHostOfNewParticipant`)
  - 申請が承認されて参加者が追加されたときにホストに送信
  - 実装場所: `useEventApplications.approveApplication()`

#### 4. チャットメッセージ通知
**トリガーポイント**: [EventChatScreen.tsx:583-604](yukimate/src/screens/EventChatScreen.tsx#L583-L604)

- **新規メッセージ通知** (`notifyNewChatMessage`)
  - チャットメッセージが送信されたときに他の参加者全員に送信
  - 実装場所: `EventChatScreen.sendMessage()`
  - 送信者本人には通知されない

#### 5. ★登録ユーザーのイベント通知
**トリガーポイント**:
- イベント作成時: [CreateScreen.tsx:522-530](yukimate/src/screens/tabs/CreateScreen.tsx#L522-L530)
- イベント参加時: [useEventApplications.ts:225-227](yukimate/src/hooks/useEventApplications.ts#L225-L227)

- **ホストとしてのイベント作成通知** (`notifyStarredUserEvent` with `isHost: true`)
  - ★登録したユーザーがイベントを作成したときに通知
  - 実装場所: `CreateScreen` (新規作成時のみ)
  - 関数: [useEventCreation.ts:notifyStarredUsersOfNewEvent](yukimate/src/hooks/useEventCreation.ts)

- **参加者としてのイベント参加通知** (`notifyStarredUserEvent` with `isHost: false`)
  - ★登録したユーザーがイベントに参加したときに、同じイベントの参加者に通知
  - 実装場所: `useEventApplications.approveApplication()`
  - 関数: [useEventCreation.ts:notifyStarredUsersOfParticipation](yukimate/src/hooks/useEventCreation.ts)

#### 6. イベント開始リマインダー
**トリガーポイント**: [useEventApplications.ts:229-238](yukimate/src/hooks/useEventApplications.ts#L229-L238)

- **イベント開始30分前リマインダー** (`scheduleReminderOnJoin`)
  - イベント参加時にローカル通知をスケジュール
  - 実装場所: `useEventApplications.approveApplication()`
  - 実装: [eventNotificationService.ts:scheduleReminderOnJoin](yukimate/src/services/eventNotificationService.ts)

#### 7. イベント終了後の評価リマインダー
**トリガーポイント**: [schedule-event-notifications/index.ts](supabase/functions/schedule-event-notifications/index.ts)

- **イベント終了6時間後の評価リマインダー** (`notifyPostEventAction`)
  - GitHub Actionsで毎時実行されるSupabase Edge Functionから送信
  - 設定: [.github/workflows/event-notifications-cron.yml](.github/workflows/event-notifications-cron.yml)
  - セットアップ手順: [NOTIFICATION_SETUP.md](NOTIFICATION_SETUP.md)

#### 8. イベントキャンセル通知
**トリガーポイント**: [useEventDeletion.ts:deleteEvent](yukimate/src/hooks/useEventDeletion.ts)

- **イベントキャンセル通知** (`notifyEventCancellation`)
  - イベントがキャンセルされたときに全参加者に送信
  - 実装場所: `deleteEvent()` ヘルパー関数
  - 実装: [eventNotificationService.ts:notifyEventCancellation](yukimate/src/services/eventNotificationService.ts)

## 通知設定

全ての通知は、ユーザーの通知設定に従って送信されます。設定項目:

1. `pushEnabled` - プッシュ通知の総合ON/OFF
2. `eventApplications` - イベント申請の承認/却下通知
3. `eventReminders` - イベント開始リマインダー
4. `eventCancellations` - イベントキャンセル通知
5. `newParticipants` - 新規参加者通知（ホスト向け）
6. `newApplications` - 新規申請通知（ホスト向け）
7. `starredUserEvents` - ★登録ユーザーのイベント通知
8. `chatMessages` - チャットメッセージ通知
9. `postEventReminders` - イベント終了後の評価リマインダー

設定の確認: [notificationService.ts:isNotificationEnabled](yukimate/src/services/notificationService.ts)

## 通知の流れ

### クライアント側通知（即時）
```
アクション → 通知関数呼び出し → 設定確認 → トークン取得 → Edge Function呼び出し → Expo Push送信
```

### サーバー側通知（スケジュール）
```
GitHub Actions Cron → Edge Function → イベント検索 → 参加者取得 → 各参加者に通知送信
```

## 実装ファイル一覧

### 通知サービス
- [notificationService.ts](yukimate/src/services/notificationService.ts) - 通知送信の中核
- [eventNotificationService.ts](yukimate/src/services/eventNotificationService.ts) - イベント関連通知

### フック/ヘルパー
- [useEventApplications.ts](yukimate/src/hooks/useEventApplications.ts) - 申請承認/却下
- [useDiscoverEvents.ts](yukimate/src/hooks/useDiscoverEvents.ts) - イベント申請
- [useEventCreation.ts](yukimate/src/hooks/useEventCreation.ts) - ★登録ユーザー通知
- [useEventDeletion.ts](yukimate/src/hooks/useEventDeletion.ts) - イベント削除/キャンセル

### 画面コンポーネント
- [CreateScreen.tsx](yukimate/src/screens/tabs/CreateScreen.tsx) - イベント作成
- [EventChatScreen.tsx](yukimate/src/screens/EventChatScreen.tsx) - チャット
- [EventDetailScreen.tsx](yukimate/src/screens/EventDetailScreen.tsx) - イベント詳細

### Edge Functions
- [send-notification/index.ts](supabase/functions/send-notification/index.ts) - 通知送信
- [schedule-event-notifications/index.ts](supabase/functions/schedule-event-notifications/index.ts) - スケジュール通知

### 設定ファイル
- [.github/workflows/event-notifications-cron.yml](.github/workflows/event-notifications-cron.yml) - GitHub Actions Cron設定

## トラブルシューティング

### 通知が届かない場合

1. **通知トークンの確認**
   ```sql
   SELECT * FROM notification_tokens WHERE user_id = 'USER_ID';
   ```

2. **通知設定の確認**
   - アプリの設定画面で各通知項目が有効になっているか確認
   - AsyncStorageに保存された設定を確認

3. **Edge Functionのログ確認**
   - Supabase Dashboard > Edge Functions > Logs
   - GitHub Actions > ワークフロー実行ログ

4. **デバイスの確認**
   - デバイスの通知許可設定を確認
   - Expo Goアプリの通知権限を確認

### よくある問題

**問題**: イベント終了6時間後の通知が来ない
**原因**: GitHub Actions Cronが設定されていない、またはSecretsが未設定
**解決**: [NOTIFICATION_SETUP.md](NOTIFICATION_SETUP.md)を参照

**問題**: チャット通知が多すぎる
**原因**: 参加者全員に毎回通知が送信される
**解決**: 通知設定で`chatMessages`をOFFにする、または通知頻度制限を実装

**問題**: ★登録ユーザーの通知が届かない
**原因**: `starred_users`テーブルにデータがない
**解決**: ユーザープロフィール画面で★ボタンを押して登録

## 今後の改善案

### 1. 通知のバッチ処理
現在、チャットメッセージ通知は参加者ごとに個別に送信されています。これを一括送信に変更することでパフォーマンスを向上できます。

### 2. 通知頻度制限
同じイベントのチャットで短時間に複数のメッセージがある場合、通知をまとめる機能を追加。

### 3. Rich Notification
画像や詳細情報を含むリッチ通知の実装。

### 4. 通知履歴
アプリ内で過去の通知を確認できる履歴機能。

### 5. Database Triggers
Supabase Database Triggersを使用して、より確実な通知送信を実現。

例:
```sql
CREATE TRIGGER on_event_application_created
AFTER INSERT ON event_applications
FOR EACH ROW
EXECUTE FUNCTION notify_host_of_new_application();
```

### 6. ローカル通知のキャンセル
イベント参加をキャンセルした場合、スケジュールされたローカル通知もキャンセルする機能。

## 関連ドキュメント

- [NOTIFICATION_SETUP.md](NOTIFICATION_SETUP.md) - 通知システムのセットアップ手順
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
