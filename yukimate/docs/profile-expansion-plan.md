# プロフィール機能拡張 設計プラン

> 確定版。決定事項を反映済み。実装はこのドキュメントの「実装順序」に従う。

## 目的（5機能）

1. お気に入りスキー場（複数選択） … 旧「ホームリゾート」を置き換え
2. 滑走頻度 … イベント実績からよく行くゲレンデ Top3 を自動集計
3. プロフィール投稿グリッド（インスタ風の個人投稿。コミュニティ投稿とは別物）
4. SNSリンク
5. ユーザー評価 … 5段階絵文字リアクションで「高評価率%」を算出（スター・ブロックは健在）

## 確定した設計判断

- **主リゾート**: ホーム画面の天気・おすすめは「複数リゾートを切り替え表示」。`home_resort_id` には依存しない。
- **評価の源**: 5段階絵文字リアクション（新テーブル `user_reactions`）から高評価率%を算出。スター/ブロックとは別軸で併存。

---

## 1. お気に入りスキー場（複数化）

### DB
```sql
CREATE TABLE public.favorite_resorts (
  user_id   uuid NOT NULL REFERENCES public.users(id),
  resort_id uuid NOT NULL REFERENCES public.resorts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resort_id)
);
-- 既存 home_resort_id を移行
INSERT INTO public.favorite_resorts (user_id, resort_id)
SELECT user_id, home_resort_id FROM public.profiles
WHERE home_resort_id IS NOT NULL
ON CONFLICT DO NOTHING;
```
`profiles.home_resort_id` は当面残置（後方互換）。新規ロジックは `favorite_resorts` を参照する。

### コード修正
- `src/types/user.ts` … `homeResortId/homeResortName` を削除し `favoriteResorts: { id: string; name: string }[]` を追加
- `src/hooks/useProfile.ts` … `favorite_resorts` を JOIN 取得。「searchable な最初のリゾートにフォールバック」ロジックを廃止/置換
- `src/screens/EditProfileScreen.tsx` … リゾート複数選択ピッカー（チェックボックス式）
- `src/screens/tabs/ProfileSetupScreen.tsx` … 初回設定を複数選択化
- `src/screens/tabs/ProfileScreen.tsx` … タグ表示をお気に入り複数に
- `src/hooks/useHomeData.ts` / `useDiscoverEvents.ts` / `SnowfeedScreen.tsx` / `WeatherCard.tsx` / `ExploreScreen.tsx` … 単一リゾート前提を「切り替え表示」対応に変更（選択中リゾートを state で保持）
- `src/lib/database.types.ts` … `favorite_resorts` テーブル型を追加
- `src/i18n/translations.ts` … 文言追加

---

## 2. 滑走頻度（Top3 リゾート）

スキーマ変更なし。`useProfile.ts` に集計を追加。

- 主催: `posts_events.host_user_id = userId` の `resort_id`
- 参加: `event_participants`（`left_at IS NULL`）→ `posts_events.resort_id`
- 両者を event 単位で結合 → `resort_id` ごとにイベント数を集計 → Top3（リゾート名付き）
- `ProfileData` に `topResorts: { id: string; name: string; count: number }[]` を追加
- ProfileScreen に「よく行くゲレンデ 🥇○○ 12 / 🥈△△ 8 / 🥉□□ 5」を表示

---

## 3. プロフィール投稿グリッド

**重要**: これは `feed_posts`（コミュニティ＝ゲレンデ状態の共有投稿）とは**別物**。
ユーザーが自分のプロフィールに投稿する個人投稿で、新テーブル `profile_posts` を使う。

### DB（新テーブル）
```sql
CREATE TABLE public.profile_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photos text[] NOT NULL DEFAULT '{}'::text[],   -- まずは写真のみ
  caption text,
  resort_id uuid REFERENCES public.resorts(id),  -- 任意：差別化用
  created_at timestamptz NOT NULL DEFAULT now()
);
```
- Storage: 画像用バケット `profile_posts`（public）を作成

### コード
- 新規 `useProfilePosts(userId)` … `profile_posts` を `user_id` で取得
- 投稿作成 UI（写真選択 + キャプション）。**入口は2つ**:
  - プロフィール画面（自分のプロフィール上の「＋」ボタン）
  - ホーム画面
- ProfileScreen 下部に 3 列グリッド（`FlatList numColumns={3}`）。タップで投稿詳細へ
- **差別化**: サムネにリゾート名・日付タグをオーバーレイ。将来「ゲレンデ別 / シーズン別」フィルタ
- 投稿は**写真のみ**（動画は第2段階）
- 注: 現 `MyPostsScreen` はイベント一覧で無関係。グリッドは ProfileScreen 内に新設

---

## 4. SNSリンク

### DB
```sql
ALTER TABLE public.profiles ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
-- 例: { "instagram": "handle", "x": "handle", "youtube": "url", "tiktok": "handle" }
```

### コード
- EditProfile に Input 行（ハンドル入力）
- ProfileScreen にアイコン行。タップで `Linking.openURL`
- **安全策**: 保存はハンドルのみ。表示時に `https://instagram.com/{handle}` 等を内部生成し、生 URL の直開きは避ける

---

## 5. ユーザー評価（5段階絵文字 → 高評価率%）

### DB
```sql
CREATE TYPE user_reaction_kind AS ENUM
  ('super_happy','happy','neutral','unhappy','super_unhappy');

CREATE TABLE public.user_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reactor_user_id uuid NOT NULL REFERENCES public.users(id),
  target_user_id  uuid NOT NULL REFERENCES public.users(id),
  reaction user_reaction_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reactor_user_id, target_user_id),     -- 1人1票（上書き可）
  CHECK (reactor_user_id <> target_user_id)
);

-- 集計 RPC（クライアント集計を避ける）
CREATE OR REPLACE FUNCTION public.get_user_rating(target uuid)
RETURNS TABLE(total int, high int, high_pct numeric, avg_score numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE reaction IN ('super_happy','happy'))::int,
    round(100.0 * count(*) FILTER (WHERE reaction IN ('super_happy','happy'))
          / NULLIF(count(*),0), 0),
    round(avg(CASE reaction
      WHEN 'super_happy'   THEN 5 WHEN 'happy'         THEN 4
      WHEN 'neutral'       THEN 3 WHEN 'unhappy'       THEN 2
      WHEN 'super_unhappy' THEN 1 END), 2)
  FROM public.user_reactions WHERE target_user_id = target;
$$;
```
- スコア対応: super_happy=5 / happy=4 / neutral=3 / unhappy=2 / super_unhappy=1
- 高評価 = super_happy + happy（score≥4）
- 相手に見える表示: 「高評価 87%（39件中34件）」

### コード
- 新規 `useUserRating(userId)` … `get_user_rating` を呼ぶ
- ProfileScreen … 評価サマリ表示（高評価率% + 件数）。自分以外にはリアクションピッカー
- `PostEventActionScreen.tsx` … ユーザー評価（5段階絵文字）をメインに据える。スター登録・ブロックは健在のまま下部 or サブ操作に
- スター（`stars`）/ブロック（`blocks`）は現状維持

### 設計上の注意
- ネガティブ評価は晒し・荒らしリスク。誰が付けたかは**匿名**（集計のみ表示）を推奨
- RLS: `user_reactions` は reactor 本人のみ insert/update/delete 可、集計は RPC 経由で公開

---

## 実装順序（DB変更を先にまとめる）

1. **DBマイグレーション**（Supabase で実行 — ここが全ての前提）
   - `favorite_resorts` + データ移行
   - `profiles.social_links` 追加
   - `user_reactions` + enum + `get_user_rating` RPC + RLS
   - `profile_posts` + RLS（+ Storage バケット `profile_posts` 作成）
2. ギア編集UI復活（DB不要・最低リスク。※別途）
3. お気に入りスキー場（型 → useProfile → EditProfile/Setup → ProfileScreen → ホーム系の切り替え表示）
4. 滑走頻度 Top3（useProfile 集計 → 表示）
5. SNSリンク（編集 + 表示）
6. プロフィール投稿グリッド（profile_posts 投稿UI + グリッド。入口=プロフィール/ホーム）
7. ユーザー評価リアクション（useUserRating → ProfileScreen → PostEventActionScreen）

## 未確定 / 後回し
- ギア画像アップロード（storage bucket 運用が重いため MVP はテキストのみ）
- 投稿グリッドのフィルタ（ゲレンデ別/シーズン別）は第2段階
