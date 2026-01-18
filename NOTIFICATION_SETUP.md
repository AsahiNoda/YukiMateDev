# 通知システムのセットアップ手順

## 問題の概要
イベント終了6時間後の評価リマインダー通知が送信されていない問題を解決するため、GitHub Actionsを使用した定期実行の仕組みを導入しました。

## 修正内容

### 1. GitHub Actions Workflow の作成
- ファイル: `.github/workflows/event-notifications-cron.yml`
- 機能: 毎時0分にSupabase Edge Function `schedule-event-notifications` を呼び出す
- 手動トリガーも可能（テスト用）

### 2. Supabase Config の作成
- ファイル: `supabase/config.toml`
- Edge Functionsの設定を記述

## セットアップ手順

### 1. GitHub Secrets の設定

リポジトリのSettings > Secrets and variables > Actions で以下のシークレットを追加してください:

1. **SUPABASE_URL**
   - 値: SupabaseプロジェクトのベースURL
   - 例: `https://xxxxxxxxxxxxx.supabase.co`
   - 取得方法: Supabase Dashboard > Settings > API > Project URL

2. **SUPABASE_SERVICE_ROLE_KEY**
   - 値: Supabaseのサービスロールキー（秘密鍵）
   - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - 取得方法: Supabase Dashboard > Settings > API > service_role key
   - ⚠️ **警告**: このキーは非常に強力な権限を持つため、絶対に公開しないでください

### 2. GitHub Actions の有効化

1. リポジトリの Settings > Actions > General に移動
2. "Allow all actions and reusable workflows" を選択
3. "Read and write permissions" を有効化（必要に応じて）

### 3. デプロイと確認

```bash
# リポジトリにプッシュ
git add .github/workflows/event-notifications-cron.yml
git add supabase/config.toml
git add NOTIFICATION_SETUP.md
git commit -m "Add GitHub Actions cron for event notifications"
git push
```

### 4. 動作確認

#### 手動トリガーでテスト
1. GitHub リポジトリの Actions タブを開く
2. "Event Notifications Scheduler" ワークフローを選択
3. "Run workflow" ボタンをクリック
4. ワークフローが成功することを確認

#### Supabase Logsで確認
1. Supabase Dashboard > Edge Functions > schedule-event-notifications
2. Logs タブで実行ログを確認
3. 正常に実行されているか、エラーがないかを確認

#### 通知の確認
1. テスト用にイベントを作成し、終了時刻を6時間前に設定（データベースで直接操作）
2. GitHub Actionsを手動実行
3. 参加者のデバイスに通知が届くことを確認

## トラブルシューティング

### GitHub Actions が失敗する場合

**エラー: "Failed to fetch"**
- SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が正しく設定されているか確認
- Edge Function `schedule-event-notifications` がデプロイされているか確認

**エラー: "401 Unauthorized"**
- SUPABASE_SERVICE_ROLE_KEY が正しいか確認
- キーに余計なスペースや改行がないか確認

### 通知が届かない場合

1. **Edge Function のログを確認**
   ```
   Supabase Dashboard > Edge Functions > schedule-event-notifications > Logs
   ```

2. **通知トークンの確認**
   ```sql
   SELECT * FROM notification_tokens WHERE user_id = 'USER_ID';
   ```

3. **イベント終了時刻の確認**
   ```sql
   SELECT id, title, end_at
   FROM posts_events
   WHERE end_at BETWEEN NOW() - INTERVAL '6.5 hours' AND NOW() - INTERVAL '5.5 hours';
   ```

4. **参加者の確認**
   ```sql
   SELECT * FROM event_participants WHERE event_id = 'EVENT_ID' AND left_at IS NULL;
   ```

## 代替案

GitHub Actionsが使えない場合、以下の代替案があります:

### 1. Vercel Cron Jobs
Vercelでホスティングしている場合、`vercel.json`で設定可能:

```json
{
  "crons": [{
    "path": "/api/trigger-notifications",
    "schedule": "0 * * * *"
  }]
}
```

### 2. 外部Cronサービス
- [cron-job.org](https://cron-job.org) (無料)
- [EasyCron](https://www.easycron.com) (無料プランあり)
- [Cronitor](https://cronitor.io) (無料プランあり)

設定例:
- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/schedule-event-notifications`
- Method: POST
- Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
- Schedule: Every hour

### 3. AWS EventBridge / Google Cloud Scheduler
クラウドプロバイダーのマネージドCronサービスを使用

## 注意事項

- GitHub Actions の無料枠: パブリックリポジトリは無制限、プライベートは月2,000分
- 通知は毎時1回チェックされるため、最大1時間の遅延が発生する可能性があります
- より精密なタイミングが必要な場合は、チェック頻度を増やしてください（例: `*/30 * * * *` で30分ごと）

## 参考リンク

- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Crontab.guru](https://crontab.guru/) - Cron式のテストツール
