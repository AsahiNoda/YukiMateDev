-- ============================================================
-- 新規登録の前に、そのメールアドレスの状態を調べる【提案】
-- ------------------------------------------------------------
--   new        … まだ使われていない → そのまま新規登録
--   incomplete … アカウントはあるがプロフィールが無い（確認メールの期限切れなどで登録を終えていない）
--                → パスワードを決めるリンクを送り直して続きから
--   registered … プロフィールまで作り終えている → 新規登録はさせず、ログイン（またはパスワードの再設定）へ
--
-- Supabase の signUp も登録済みのメールには「User already registered」を返すので、
-- 「登録済みかどうか」はこれで新たに分かるようになる情報ではない（登録の画面で使うだけ）。
-- 再実行しても安全。
-- ============================================================

CREATE OR REPLACE FUNCTION public.signup_email_status(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE
    WHEN u.id IS NULL THEN 'new'
    WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id) THEN 'registered'
    ELSE 'incomplete'
  END
  FROM (SELECT 1) AS one
  LEFT JOIN auth.users u ON lower(u.email) = lower(btrim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.signup_email_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_email_status(text) TO anon, authenticated;
