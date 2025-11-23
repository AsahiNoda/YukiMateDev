# Supabase Storage Setup for Profile Images

## Storage Buckets

以下の2つのストレージバケットを作成してください：

### 1. profile_avatar
- **名前**: `profile_avatar`
- **Public**: Yes (公開アクセス可能)
- **用途**: ユーザーのアバター画像

### 2. profile_header
- **名前**: `profile_header`
- **Public**: Yes (公開アクセス可能)
- **用途**: ユーザーのヘッダー画像

## Storage Policies

### profile_avatar のポリシー

#### 1. SELECT (読み取り) - 誰でも読み取り可能
```sql
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_avatar');
```

#### 2. INSERT (アップロード) - 認証済みユーザーのみ
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 3. UPDATE (更新) - 自分のアバターのみ更新可能
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 4. DELETE (削除) - 自分のアバターのみ削除可能
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### profile_header のポリシー

#### 1. SELECT (読み取り) - 誰でも読み取り可能
```sql
CREATE POLICY "Header images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_header');
```

#### 2. INSERT (アップロード) - 認証済みユーザーのみ
```sql
CREATE POLICY "Users can upload their own header"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_header' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 3. UPDATE (更新) - 自分のヘッダーのみ更新可能
```sql
CREATE POLICY "Users can update their own header"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_header' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 4. DELETE (削除) - 自分のヘッダーのみ削除可能
```sql
CREATE POLICY "Users can delete their own header"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_header' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Database Schema Update

`profiles` テーブルに `header_url` カラムを追加：

```sql
ALTER TABLE public.profiles
ADD COLUMN header_url text;
```

## ファイル命名規則

画像は以下のパス形式で保存されます：
- アバター: `{user_id}/avatar.jpg`
- ヘッダー: `{user_id}/header.jpg`

## 実装手順

1. Supabase Dashboard でバケットを作成
2. 上記のポリシーをSQLエディタで実行
3. `profiles` テーブルに `header_url` カラムを追加
4. アプリケーションコードを更新
