# 運営ダッシュボード（Supabase Studio）

運営で見るもの・することは、すべて `admin` スキーマにまとめてある
（`supabase/migrations/20261125000000_admin_dashboard.sql`）。
アプリ（API）からは見えない。Studio にログインできる人だけが使える。

## 見る場所

Studio → **Table Editor** → 左上のスキーマ選択を **admin** にする。

| ビュー | 何がわかるか | 毎日見るか |
| --- | --- | --- |
| `summary` | 未対応の通報・問い合わせの数、一番古い未対応の通報からの経過時間、ユーザー数、停止中の人数 | ◎ まずここ |
| `reports_inbox` | 通報を対象ごとにまとめたもの。未対応の件数・通報した人数・理由・対象の中身・持ち主 | ◎ |
| `inquiries_inbox` | 問い合わせ。未対応が先頭。送った人の名前とメール | ◎ |
| `users_overview` | ユーザー一覧。メール・最終ログイン・投稿数・通報された件数（未対応）・停止中か | 必要なとき |
| `daily_stats` | 直近60日の日ごとの数（日本時間）：登録・イベント・申請・投稿・通報・問い合わせ | 週1くらい |
| `reports_all` | 通報1件ずつ（誰がいつ何の理由で） | 必要なとき |
| `moderation_log` | 運営が行った対応の履歴（下の関数で自動で残る） | 必要なとき |

> 規約で「通報は24時間以内に確認」と約束している。`summary.oldest_open_report_age` が 1 day を超えていないかを見る。

## すること（SQL Editor で実行）

Studio → **SQL Editor**。よく使うものは「Save」して名前を付けておくと、次から1クリックで開ける。

```sql
-- 通報を対応済みにする（対象ごと。status は reviewed＝確認した／closed＝対応完了）
select admin.close_reports('event', '対象のID', 'closed', '問題なし');

-- 利用停止（7日）。ログインとトークンの更新ができなくなる
select admin.suspend_user('ユーザーID', 7, 'スパム投稿');

-- 停止の解除
select admin.unsuspend_user('ユーザーID', '異議を確認');

-- 問い合わせの状態（open / in_progress / resolved / closed）
select admin.set_inquiry_status('問い合わせID', 'resolved', 'メールで返信済み');
```

- 対象のID・ユーザーIDは、`reports_inbox` や `users_overview` の行をクリックしてコピーする。
- 投稿・イベント・チャンネルの投稿を消すときは、Table Editor の `public` スキーマで該当の行を消す
  （チャンネルの投稿は `channel_posts.deleted_at` に日時を入れると論理削除）。
- 停止しても、すでにログイン中の人は最大1時間ほど（トークンの期限まで）使える。急ぐときは投稿を先に消す。

## 注意

- **Project Settings → API → Exposed schemas に `admin` を足さない**（足すとアプリから見えてしまう）。
- 関数で行った対応は `admin.moderation_actions` に残る。Table Editor で直接書き換えた分は残らない。
