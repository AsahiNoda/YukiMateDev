# 翻訳実装ガイド / Translation Implementation Guide

このガイドでは、YukiMateアプリの各画面を日本語・英語の多言語対応にする方法を説明します。

## 🎯 概要

既に以下が実装済みです：
- ✅ 翻訳システム (`src/i18n/translations.ts`) - 800行以上の日英翻訳
- ✅ `useTranslation` フック
- ✅ `LocaleContext` (言語切り替え機能)
- ✅ 実装済み画面:
  - SettingsScreen
  - SignInScreen
  - AccountSettingsScreen
  - NotificationSettingsScreen

## 📝 実装手順

### ステップ1: インポートの追加

画面ファイルの上部に `useTranslation` をインポートします：

```typescript
import { useTranslation } from '@/hooks/useTranslation';
```

### ステップ2: フックの使用

コンポーネント内で `useTranslation` フックを使用します：

```typescript
export default function YourScreen() {
  const { t } = useTranslation();
  // ... 他のフック
}
```

### ステップ3: ハードコードされた文字列を置き換え

すべての日本語文字列を `t()` 関数で置き換えます：

#### 置き換え前:
```typescript
<Text>設定</Text>
Alert.alert('エラー', 'ログアウトに失敗しました');
placeholder="メールアドレス"
```

#### 置き換え後:
```typescript
<Text>{t('settings.title')}</Text>
Alert.alert(t('common.error'), t('settings.logoutError'));
placeholder={t('auth.email')}
```

## 🗂️ 翻訳キー一覧

### 共通 (common)
```typescript
t('common.cancel')       // キャンセル / Cancel
t('common.ok')           // OK / OK
t('common.save')         // 保存 / Save
t('common.delete')       // 削除 / Delete
t('common.edit')         // 編集 / Edit
t('common.back')         // 戻る / Back
t('common.error')        // エラー / Error
t('common.loading')      // 読み込み中... / Loading...
t('common.processing')   // 処理中... / Processing...
t('common.sending')      // 送信中... / Sending...
```

### 認証 (auth)
```typescript
t('auth.signIn')         // ログイン / Sign In
t('auth.signUp')         // 新規登録 / Sign Up
t('auth.email')          // メールアドレス / Email
t('auth.password')       // パスワード / Password
t('auth.tagline')        // スキー・スノーボード愛好者のためのSNS
```

### 設定 (settings)
```typescript
t('settings.title')              // 設定 / Settings
t('settings.logout')             // ログアウト / Logout
t('settings.accountSettings')    // アカウント設定 / Account Settings
t('settings.notificationSettings') // 通知設定 / Notification Settings
```

### アカウント設定 (accountSettings)
```typescript
t('accountSettings.title')                    // アカウント設定
t('accountSettings.changeEmail')              // メールアドレスを変更
t('accountSettings.changePassword')           // パスワードを変更
t('accountSettings.emailUpdateSuccess')       // 確認メールを送信しました
t('accountSettings.passwordChangeSuccess')    // パスワード変更完了
```

### 通知設定 (notificationSettings)
```typescript
t('notificationSettings.title')               // 通知設定
t('notificationSettings.pushNotifications')   // プッシュ通知
t('notificationSettings.eventNotifications')  // イベント通知
t('notificationSettings.chatMessages')        // チャットメッセージ
```

### ホーム (home)
```typescript
t('home.title')              // ホーム / Home
t('home.discover')           // 発見 / Discover
t('home.saved')              // 保存 / Saved
t('home.myPosts')            // マイ投稿 / My posts
t('home.featuredPosts')      // 注目の投稿 / Featured posts
```

### イベント作成 (create)
```typescript
t('create.title')            // 投稿作成 / Create Post
t('create.titleLabel')       // タイトル * / Title *
t('create.categoryLabel')    // カテゴリ * / Category *
t('create.dateLabel')        // 日付 * / Date *
t('create.post')             // 投稿する / Post
```

### イベント詳細 (eventDetail)
```typescript
t('eventDetail.eventNotFound')      // イベントが見つかりません
t('eventDetail.participants')       // 参加者 / Participants
t('eventDetail.host')               // ホスト / Host
t('eventDetail.applyToJoin')        // 参加申請 / Apply to join
```

## 💡 実装例

### Example 1: シンプルなテキスト

```typescript
// Before
<Text style={styles.title}>設定</Text>

// After
<Text style={styles.title}>{t('settings.title')}</Text>
```

### Example 2: Alert

```typescript
// Before
Alert.alert('エラー', 'ログアウトに失敗しました');

// After
Alert.alert(t('common.error'), t('settings.logoutError'));
```

### Example 3: Placeholder

```typescript
// Before
<TextInput
  placeholder="メールアドレス"
/>

// After
<TextInput
  placeholder={t('auth.email')}
/>
```

### Example 4: 条件付きテキスト

```typescript
// Before
<Text>{mode === 'signin' ? 'ログイン' : '新規登録'}</Text>

// After
<Text>{mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}</Text>
```

### Example 5: ボタンラベル (ローディング状態)

```typescript
// Before
<Text>
  {loading ? '処理中...' : 'ログイン'}
</Text>

// After
<Text>
  {loading ? t('common.processing') : t('auth.signIn')}
</Text>
```

## 📋 残りの画面リスト

以下の画面がまだ翻訳対応されていません。上記のパターンに従って更新してください：

### 優先度: 高
- [ ] `DeleteAccountScreen.tsx`
- [ ] `CreateScreen.tsx` (イベント作成)
- [ ] `EventDetailScreen.tsx`
- [ ] `DiscoverScreen.tsx`
- [ ] `HomeScreen.tsx`

### 優先度: 中
- [ ] `ProfileScreen.tsx`
- [ ] `EditProfileScreen.tsx`
- [ ] `ChatScreen.tsx`
- [ ] `SnowfeedScreen.tsx`

### コンポーネント
- [ ] `ErrorBoundary.tsx`
- [ ] `NetworkStatusBar.tsx`
- [ ] `ResortSearch.tsx`
- [ ] `PostCreateModal.tsx`
- [ ] `error-state.tsx`
- [ ] `loading-state.tsx`

## 🔍 翻訳が必要な文字列の見つけ方

1. **Visual Studio Code の検索機能を使用**:
   ```
   正規表現で検索: ['"][\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+['"]
   ```
   これで日本語文字列を含むコードが見つかります。

2. **よくあるパターン**:
   - `<Text>日本語</Text>`
   - `Alert.alert('日本語', '日本語メッセージ')`
   - `placeholder="日本語"`
   - `title="日本語"`

## ⚙️ 新しい翻訳の追加方法

`src/i18n/translations.ts` に新しい翻訳を追加する場合：

```typescript
export const translations = {
  ja: {
    yourSection: {
      yourKey: '日本語テキスト',
      anotherKey: '別の日本語テキスト',
    },
  },
  en: {
    yourSection: {
      yourKey: 'English text',
      anotherKey: 'Another English text',
    },
  },
};
```

使用方法:
```typescript
t('yourSection.yourKey')  // "日本語テキスト" または "English text"
```

## ✅ テスト方法

1. **言語切り替えテスト**:
   - 設定画面を開く
   - 言語を「日本語」→「English」に切り替え
   - 更新した画面を確認
   - すべてのテキストが英語に変わっていることを確認

2. **エラーメッセージのテスト**:
   - 各アラートやエラーメッセージが正しく翻訳されているか確認
   - 両言語で意味が通じるか確認

3. **プレースホルダーテキスト**:
   - 入力フィールドのプレースホルダーが翻訳されているか確認

## 🎨 ベストプラクティス

1. **一貫性を保つ**:
   - 同じ意味の文字列には同じ翻訳キーを使用
   - 例: `t('common.cancel')` を複数の場所で使用

2. **意味のあるキー名**:
   - `t('btn1')` ❌
   - `t('settings.logout')` ✅

3. **階層構造**:
   - セクションごとにグループ化
   - `settings.title`, `settings.logout`, etc.

4. **コメントの追加**:
   ```typescript
   // 成功時のメッセージ
   emailUpdateSuccess: '確認メールを送信しました',
   ```

## 🚀 完成したファイルの例

完全に翻訳対応された画面の例は以下を参照してください：
- `src/screens/SettingsScreen.tsx`
- `src/screens/auth/SignInScreen.tsx`
- `src/screens/AccountSettingsScreen.tsx`
- `src/screens/NotificationSettingsScreen.tsx`

これらのファイルを参考にして、他の画面も同じパターンで実装してください。

## ❓ トラブルシューティング

### エラー: "Cannot read property 't' of undefined"
**原因**: `useTranslation` フックを使用していない
**解決**: コンポーネントに `const { t } = useTranslation();` を追加

### エラー: 翻訳キーが表示される (例: "settings.title")
**原因**: 翻訳キーが `translations.ts` に存在しない
**解決**: `src/i18n/translations.ts` に翻訳を追加

### 言語が切り替わらない
**原因**: `LocaleProvider` が `RootLayout` に設定されていない、またはコンポーネントが再レンダリングされていない
**解決**: アプリを再起動するか、`RootLayout.tsx` を確認

## 📚 参考リンク

- 翻訳ファイル: `src/i18n/translations.ts`
- useTranslation フック: `src/hooks/useTranslation.ts`
- LocaleContext: `src/contexts/LocaleContext.tsx`

---

**質問がある場合**: このガイドに従って実装し、問題が発生した場合は既に実装済みの画面を参考にしてください。
