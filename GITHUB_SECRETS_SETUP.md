# GitHub Secrets 設定ガイド

イベント終了後の評価リマインダー通知を有効にするために、GitHub Secretsを設定する必要があります。

## ステップ 1: Supabase認証情報の取得

### 1-1. Supabaseダッシュボードにアクセス

1. ブラウザで [https://app.supabase.com](https://app.supabase.com) を開く
2. プロジェクト（SnowMate / YukiMate）を選択

### 1-2. Project URL の取得

1. 左サイドバーの **⚙️ Settings** をクリック
2. **API** セクションを選択
3. **Project URL** をコピー
   ```
   例: https://abcdefghijklmno.supabase.co
   ```
4. メモ帳などに保存しておく

### 1-3. Service Role Key の取得

1. 同じ **API** ページで下にスクロール
2. **Project API keys** セクションを見つける
3. **service_role** キーの横にある「👁️ Reveal」ボタンをクリック
4. 表示されたキー全体をコピー
   ```
   例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```
5. メモ帳などに保存しておく

⚠️ **重要**: この`service_role`キーは非常に強力な権限を持つため、**絶対に公開したり、コードにコミットしないでください**。

---

## ステップ 2: GitHubリポジトリにSecretsを追加

### 2-1. GitHubリポジトリにアクセス

1. ブラウザで [https://github.com](https://github.com) を開く
2. SnowMateプロジェクトのリポジトリを開く
   ```
   例: https://github.com/YOUR_USERNAME/SnowMate
   ```

### 2-2. Settings ページに移動

1. リポジトリ上部の **⚙️ Settings** タブをクリック
2. 左サイドバーの **Secrets and variables** を展開
3. **Actions** をクリック

### 2-3. 1つ目のSecret（SUPABASE_URL）を追加

1. 右上の **New repository secret** ボタンをクリック
2. 以下を入力:
   - **Name**: `SUPABASE_URL`
   - **Secret**: ステップ1-2でコピーしたProject URL を貼り付け
     ```
     https://abcdefghijklmno.supabase.co
     ```
3. **Add secret** ボタンをクリック

### 2-4. 2つ目のSecret（SUPABASE_SERVICE_ROLE_KEY）を追加

1. 再度 **New repository secret** ボタンをクリック
2. 以下を入力:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Secret**: ステップ1-3でコピーしたService Role Key を貼り付け
     ```
     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
     ```
3. **Add secret** ボタンをクリック

### 2-5. 設定を確認

**Secrets and variables > Actions** ページで、以下の2つのSecretsが表示されていることを確認:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

---

## ステップ 3: GitHub Actionsの有効化

### 3-1. Actions設定を確認

1. リポジトリの **⚙️ Settings** タブで、左サイドバーの **Actions** を展開
2. **General** をクリック
3. **Actions permissions** で以下を選択:
   - ✅ **Allow all actions and reusable workflows**
4. **Workflow permissions** で以下を選択:
   - ✅ **Read and write permissions**
5. 変更があれば **Save** ボタンをクリック

---

## ステップ 4: 動作確認

### 4-1. GitHub Actionsワークフローを手動実行

1. リポジトリの **Actions** タブをクリック
2. 左サイドバーで **Event Notifications Scheduler** を選択
3. 右上の **Run workflow** ボタンをクリック
4. `Branch: master` を選択
5. **Run workflow** をクリック

### 4-2. 実行結果を確認

1. 数秒後、ワークフローの実行が開始される
2. 実行中のワークフローをクリックして詳細を開く
3. **trigger-notifications** ジョブをクリック
4. ログを確認:
   - ✅ **緑色のチェックマーク**: 成功
   - ❌ **赤色のバツマーク**: 失敗

### 4-3. 成功した場合

ログに以下のようなメッセージが表示されます:
```
Successfully triggered event notifications
Response: {"success":true,"eventsProcessed":0,"notificationsSent":0}
```

これで設定完了です！🎉

### 4-4. 失敗した場合

#### エラー: "Failed to fetch"
- SUPABASE_URL が正しく設定されているか確認
- URLに`https://`が含まれているか確認
- Edge Function `schedule-event-notifications` がSupabaseにデプロイされているか確認

#### エラー: "401 Unauthorized"
- SUPABASE_SERVICE_ROLE_KEY が正しく設定されているか確認
- キーに余計なスペースや改行が含まれていないか確認
- キーの最初と最後が欠けていないか確認（コピー時のミス）

#### エラー: "404 Not Found"
- Edge Function `schedule-event-notifications` がデプロイされていません
- Supabase CLIでデプロイする必要があります:
  ```bash
  cd supabase
  supabase functions deploy schedule-event-notifications
  ```

---

## ステップ 5: Supabase Logsで確認（オプション）

### 5-1. Edge Function Logsを確認

1. Supabase Dashboard を開く
2. 左サイドバーの **Edge Functions** をクリック
3. `schedule-event-notifications` を選択
4. **Logs** タブをクリック
5. GitHub Actionsの実行時刻付近のログを確認

成功した場合、以下のようなログが表示されます:
```
✅ Checking for events that ended 6 hours ago...
✅ Found 0 events
✅ Notification check completed
```

---

## 自動実行のスケジュール

設定が完了すると、GitHub Actionsは以下のスケジュールで自動実行されます:

- **実行頻度**: 毎時0分
- **Cron式**: `0 * * * *`
- **例**:
  - 00:00 (深夜0時)
  - 01:00 (午前1時)
  - 02:00 (午前2時)
  - ...
  - 23:00 (午後11時)

### カスタマイズ

実行頻度を変更したい場合は、`.github/workflows/event-notifications-cron.yml`の`schedule`セクションを編集:

```yaml
schedule:
  - cron: '0 * * * *'  # 毎時0分
  # - cron: '*/30 * * * *'  # 30分ごと
  # - cron: '0 */2 * * *'   # 2時間ごと
```

Cron式のテストツール: [https://crontab.guru/](https://crontab.guru/)

---

## トラブルシューティング

### 通知が届かない場合

1. **GitHub Actionsが正常に実行されているか確認**
   - リポジトリの **Actions** タブでワークフローの実行履歴を確認
   - 失敗している場合はログを確認

2. **Supabase Edge Functionが正常に動作しているか確認**
   - Supabase Dashboard > Edge Functions > Logs でエラーを確認

3. **イベントが6時間前に終了しているか確認**
   - 通知は `end_at` が6時間前（±30分）のイベントにのみ送信されます
   - テスト用にイベントの`end_at`を過去に設定してテスト可能

4. **通知トークンが登録されているか確認**
   ```sql
   SELECT * FROM notification_tokens WHERE user_id = 'YOUR_USER_ID';
   ```

5. **ユーザーの通知設定が有効か確認**
   - アプリの設定 > 通知設定 > イベント後の評価リマインダー が ON になっているか確認

---

## セキュリティのベストプラクティス

### ✅ やるべきこと
- GitHub Secretsを使用してAPIキーを安全に管理
- Service Role Keyを定期的にローテーション
- 不要になったキーは無効化

### ❌ やってはいけないこと
- Service Role Keyをコードにハードコード
- Service Role Keyをコミット履歴に含める
- Service Role Keyを他人と共有
- Service Role Keyを公開リポジトリに保存

---

## 完了チェックリスト

設定が完了したら、以下を確認してください:

- [ ] Supabase Project URL を取得した
- [ ] Supabase Service Role Key を取得した
- [ ] GitHub Secretsに `SUPABASE_URL` を追加した
- [ ] GitHub Secretsに `SUPABASE_SERVICE_ROLE_KEY` を追加した
- [ ] GitHub Actionsを有効化した
- [ ] ワークフローを手動実行してテストした
- [ ] ワークフローが成功した（緑色のチェックマーク）
- [ ] Supabase Logsで実行を確認した

全てチェックできたら、通知システムは完全に動作します！🎉

---

## サポート

問題が解決しない場合は、以下を確認してください:
- GitHub Actions のログ
- Supabase Edge Functions のログ
- エラーメッセージ

それでも解決しない場合は、開発チームにお問い合わせください。
