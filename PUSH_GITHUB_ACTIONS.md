# GitHub Actionsが表示されない問題の解決方法

## 問題
GitHubリポジトリの**Actions**タブに「Event Notifications Scheduler」ワークフローが表示されない

## 原因
`.github/workflows/`ディレクトリがまだGitHubにプッシュされていません。

## 解決方法

### ステップ 1: ファイルをGitに追加

以下のコマンドを実行してファイルをステージング:

```bash
git add .github/workflows/event-notifications-cron.yml
```

または、全ての新規ファイルを追加:

```bash
git add .github/
git add supabase/config.toml
git add NOTIFICATION_SETUP.md
git add NOTIFICATION_TRIGGERS_IMPLEMENTATION.md
git add NOTIFICATION_VERIFICATION.md
git add GITHUB_SECRETS_SETUP.md
git add yukimate/src/hooks/useEventCreation.ts
git add yukimate/src/hooks/useEventDeletion.ts
git add yukimate/src/services/eventNotificationService.ts
```

### ステップ 2: コミット

```bash
git commit -m "Add notification system: GitHub Actions cron, event triggers, and documentation"
```

### ステップ 3: GitHubにプッシュ

```bash
git push origin master
```

または、ブランチ名が異なる場合:

```bash
git push origin main
```

### ステップ 4: GitHubで確認

1. GitHubリポジトリをブラウザで開く
2. **Actions** タブをクリック
3. 左サイドバーに **Event Notifications Scheduler** が表示される ✅

## 初回実行について

ワークフローをプッシュした後:

### 自動実行
- 次の毎時0分に自動的に実行されます
- 例: 現在が14:35の場合、15:00に最初の実行が行われます

### 手動実行（すぐにテストしたい場合）
1. **Actions** タブを開く
2. 左サイドバーの **Event Notifications Scheduler** をクリック
3. 右上の **Run workflow** ▼ ボタンをクリック
4. Branch: `master` (または `main`) を選択
5. **Run workflow** ボタンをクリック
6. 数秒後、ワークフローが実行されます

## トラブルシューティング

### プッシュ後もActionsタブにワークフローが表示されない

#### 原因1: GitHub Actionsが無効になっている
**解決方法:**
1. リポジトリの **Settings** タブを開く
2. 左サイドバーの **Actions** → **General** をクリック
3. **Actions permissions** で以下を選択:
   - ✅ **Allow all actions and reusable workflows**
4. **Save** をクリック

#### 原因2: ワークフローファイルに構文エラーがある
**解決方法:**
1. `.github/workflows/event-notifications-cron.yml` を開く
2. YAMLの構文が正しいか確認
3. インデントがスペース2つになっているか確認（タブではない）

オンラインバリデーター: [YAML Lint](http://www.yamllint.com/)

#### 原因3: リポジトリがプライベートで、無料プランの制限に達している
**解決方法:**
1. リポジトリの **Settings** → **Billing and plans** で使用量を確認
2. 必要に応じてプランをアップグレード
3. または、リポジトリをパブリックにする（無制限のGitHub Actions）

### 「Run workflow」ボタンが表示されない

**原因:** ワークフローファイルに `workflow_dispatch` トリガーが含まれていない

**確認方法:**
`.github/workflows/event-notifications-cron.yml` に以下が含まれているか確認:

```yaml
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:  # ← これが必要
```

含まれていれば、手動実行ボタンが表示されます。

## 完了確認チェックリスト

- [ ] `.github/workflows/event-notifications-cron.yml` をgit addした
- [ ] git commitした
- [ ] git pushした
- [ ] GitHubのActionsタブに「Event Notifications Scheduler」が表示された
- [ ] 「Run workflow」ボタンが表示された
- [ ] GitHub Secretsを設定した（`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`）
- [ ] ワークフローを手動実行してテストした
- [ ] ワークフローが成功した（緑のチェックマーク）

全てチェックできたら完了です！🎉

---

## 次のステップ

GitHub Secretsをまだ設定していない場合:
👉 [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) を参照してください
