# Windows で Supabase CLI を使用する方法

Supabase CLIはnpm経由のグローバルインストールをサポートしていません。Windowsでは以下の方法で使用できます。

## 方法1: npx を使用（推奨・インストール不要）

**最も簡単な方法**です。npxを使えば、インストールせずにSupabase CLIを実行できます。

### 使い方

すべての `supabase` コマンドの前に `npx` を付けるだけです：

```bash
# ログイン
npx supabase login

# プロジェクトリンク
npx supabase link --project-ref your-project-ref

# 環境変数設定
npx supabase secrets set FIREBASE_PROJECT_ID=your-project-id

# Edge Function デプロイ
npx supabase functions deploy send-notification

# 環境変数一覧
npx supabase secrets list

# Edge Function 一覧
npx supabase functions list
```

### メリット
- ✅ インストール不要
- ✅ 常に最新版を使用
- ✅ すぐに使える
- ✅ 権限エラーがない

### デメリット
- ⚠️ 毎回ダウンロードするため、少し遅い（初回のみ）

---

## 方法2: Scoop を使用（永続的なインストール）

Scoopはパッケージマネージャーで、Supabase CLIを永続的にインストールできます。

### 手順

1. **PowerShell を管理者権限で開く**

2. **Scoop をインストール**
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

3. **Supabase bucket を追加**
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   ```

4. **Supabase CLI をインストール**
   ```powershell
   scoop install supabase
   ```

5. **確認**
   ```bash
   supabase --version
   ```

### メリット
- ✅ インストール後は高速
- ✅ `supabase` コマンドが直接使える
- ✅ 自動更新が簡単（`scoop update supabase`）

### デメリット
- ⚠️ Scoopのインストールが必要
- ⚠️ 管理者権限が必要

---

## 方法3: 手動インストール

GitHubから直接ダウンロードして手動で配置する方法です。

### 手順

1. [Supabase CLI Releases](https://github.com/supabase/cli/releases) にアクセス

2. 最新版の `supabase_windows_amd64.zip` をダウンロード

3. ZIPを解凍して `supabase.exe` を取得

4. 以下のいずれかの場所に配置:
   - `C:\Windows\System32` （システム全体で使用）
   - `C:\Program Files\Supabase` （推奨・専用フォルダ作成）
   - 任意のフォルダ（環境変数PATHに追加）

5. **環境変数PATHに追加**（`C:\Program Files\Supabase`に配置した場合）
   - 「システムのプロパティ」→「環境変数」を開く
   - 「Path」を選択して「編集」
   - 「新規」をクリックして `C:\Program Files\Supabase` を追加
   - 「OK」で保存

6. **確認**（新しいターミナルを開いて）
   ```bash
   supabase --version
   ```

### メリット
- ✅ 完全なコントロール
- ✅ オフラインでも使用可能

### デメリット
- ⚠️ 手動更新が必要
- ⚠️ 設定が複雑

---

## 方法4: Supabase Dashboard を使用（CLI不要）

CLI を使わずに、Supabase Dashboard のGUIで設定する方法です。

### 環境変数の設定（Dashboard）

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左メニューから **「Edge Functions」** をクリック
4. 上部の **「Manage secrets」** をクリック
5. **「Add new secret」** をクリック
6. 環境変数を入力:
   - **Name**: `FIREBASE_PROJECT_ID`
   - **Value**: `your-firebase-project-id`
7. **「Save」** をクリック

同様に `FIREBASE_SERVICE_ACCOUNT_KEY` も設定。

### Edge Function のデプロイ（Dashboard - 現在ベータ版）

現在、Dashboardからの直接デプロイは完全にサポートされていません。
**Edge Function のデプロイには CLI（npx）が必要です。**

---

## 推奨方法

### ⭐️ 初めて使う場合
→ **方法1: npx を使用**

インストール不要で今すぐ使えます：
```bash
npx supabase login
```

### ⭐️ 頻繁に使う場合
→ **方法2: Scoop でインストール**

一度インストールすれば、その後は高速です。

### ⭐️ CLI を使いたくない場合
→ **方法4: Supabase Dashboard**

ただし、Edge Function のデプロイには npx が必要です。

---

## 実際の使用例（npx）

以下は、npx を使った完全なワークフロー例です：

```bash
# 1. Supabase にログイン
npx supabase login

# 2. プロジェクトディレクトリに移動
cd c:/SnowMate/SnowMateDev/yukimate

# 3. プロジェクトをリンク
npx supabase link --project-ref rmdpetmotoafaddkvyrk

# 4. Firebase プロジェクトIDを設定
npx supabase secrets set FIREBASE_PROJECT_ID=slopelink-12345

# 5. Firebase サービスアカウントキーを設定（Windowsの場合）
# PowerShell:
$key = Get-Content "C:/Downloads/slope-link-firebase-adminsdk.json" -Raw
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="$key"

# Git Bash:
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="$(cat /c/Downloads/slope-link-firebase-adminsdk.json)"

# 6. 環境変数を確認
npx supabase secrets list

# 7. Edge Function をデプロイ
npx supabase functions deploy send-notification

# 8. デプロイを確認
npx supabase functions list
```

---

## トラブルシューティング

### エラー: "Installing Supabase CLI as a global module is not supported"

**原因**: `npm install -g supabase` を実行した

**解決方法**:
- npx を使用: `npx supabase login`
- または Scoop でインストール

### エラー: "npx: command not found"

**原因**: Node.js がインストールされていない

**解決方法**:
1. [Node.js 公式サイト](https://nodejs.org/) から最新版をダウンロード
2. インストール
3. 新しいターミナルを開いて再度実行

### エラー: PowerShell でファイル読み込みができない

**原因**: PowerShell のファイル読み込み構文が異なる

**解決方法**:
```powershell
# PowerShell の場合
$key = Get-Content "C:/path/to/service-account.json" -Raw
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="$key"
```

---

## まとめ

| 方法 | インストール | 速度 | 推奨度 |
|------|------------|------|--------|
| npx | 不要 | 普通 | ⭐️⭐️⭐️⭐️⭐️ |
| Scoop | 必要 | 速い | ⭐️⭐️⭐️⭐️ |
| 手動 | 必要 | 速い | ⭐️⭐️⭐️ |
| Dashboard | 不要 | - | ⭐️⭐️（デプロイ不可） |

**結論**: まずは **npx** で試してみて、頻繁に使うなら **Scoop** でインストールすることをお勧めします。
