# オフラインサポートとデータキャッシュ戦略

このドキュメントでは、Slope Linkアプリのオフライン機能とデータキャッシュ戦略について説明します。

## 概要

Slope Linkは以下の技術を使用してオフライン対応を実装しています：

- **React Query (@tanstack/react-query)**: サーバー状態管理とインメモリキャッシュ
- **AsyncStorage**: 永続化キャッシュストレージ
- **NetInfo**: ネットワーク状態の検出
- **オフライン同期キュー**: オフライン時の操作をキューに保存し、オンライン復帰時に自動同期

## アーキテクチャ

### 1. データキャッシュ層

```
┌─────────────────────────────────────────┐
│          UI Components                   │
├─────────────────────────────────────────┤
│      React Query Hooks                   │
│   (useEventsQuery, useEventDetailQuery)  │
├─────────────────────────────────────────┤
│     React Query Cache (Memory)           │
│   - staleTime: 3分                       │
│   - gcTime: 30分                         │
├─────────────────────────────────────────┤
│    AsyncStorage Cache (Persistent)       │
│   - expiryMs: 5分                        │
│   - 永続化されたデータ                    │
└─────────────────────────────────────────┘
```

### 2. オフライン同期キュー

```
オフライン時
┌──────────────┐
│ ユーザー操作  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Offline Queue に  │
│   追加保存        │
└──────────────────┘

オンライン復帰時
┌──────────────────┐
│  ネットワーク復帰  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  キューから取得    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  サーバーに送信    │
│  (最大3回リトライ) │
└──────────────────┘
```

## 主要コンポーネント

### 1. キャッシュユーティリティ (`src/lib/cache.ts`)

AsyncStorageを使用した永続化キャッシュ機能を提供します。

```typescript
import { setCache, getCache, removeCache, fetchWithCache } from '@/lib/cache';

// データをキャッシュに保存
await setCache('events_list', eventsData, 1000 * 60 * 5); // 5分間有効

// キャッシュから取得
const cachedData = await getCache<Event[]>('events_list');

// キャッシュ付きフェッチ（キャッシュがあればそれを返す）
const data = await fetchWithCache(
  'events_list',
  () => fetchEventsFromAPI(),
  { expiryMs: 1000 * 60 * 5 }
);
```

**主な機能:**
- `setCache`: データをキャッシュに保存（有効期限付き）
- `getCache`: キャッシュからデータを取得（有効期限チェック付き）
- `removeCache`: キャッシュを削除
- `clearAllCache`: すべてのキャッシュをクリア
- `getCacheStats`: キャッシュ統計情報を取得
- `fetchWithCache`: キャッシュファーストなデータフェッチ

### 2. QueryProvider (`src/providers/QueryProvider.tsx`)

React Queryのセットアップとネットワーク状態の監視を行います。

```typescript
import { QueryProvider } from '@/providers/QueryProvider';

// RootLayoutで使用
<QueryProvider>
  <YourApp />
</QueryProvider>
```

**設定内容:**
- `staleTime: 5分` - データが"fresh"と見なされる期間
- `gcTime: 24時間` - キャッシュの保持期間
- `networkMode: 'offlineFirst'` - オフライン時もキャッシュから返す
- `retry: 3回` - ネットワークエラー時のリトライ回数
- `refetchOnReconnect: true` - ネットワーク復帰時に自動再フェッチ

### 3. イベントクエリフック (`src/hooks/useEventsQuery.ts`)

React Queryとキャッシュを使用したイベントデータフェッチ。

```typescript
import { useEventsQuery, useEventDetailQuery } from '@/hooks/useEventsQuery';

// イベント一覧を取得
const { events, loading, error, refetch, isRefreshing } = useEventsQuery();

// イベント詳細を取得
const { event, loading, error, refetch } = useEventDetailQuery(eventId);
```

**特徴:**
- AsyncStorageとReact Queryの二重キャッシュ
- オフライン時は自動的にキャッシュから返す
- オンライン復帰時に自動再フェッチ
- 手動リフレッシュ機能（キャッシュクリア付き）

### 4. オフライン同期フック (`src/hooks/useOfflineSync.ts`)

オフライン時の操作をキューに保存し、オンライン復帰時に自動同期します。

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

const {
  isOnline,
  isSyncing,
  queueLength,
  addToOfflineQueue,
  syncOfflineQueue
} = useOfflineSync();

// オフライン時の操作をキューに追加
if (!isOnline) {
  await addToOfflineQueue('create_event', eventData);
}
```

**サポートされているアクション:**
- `create_event` - イベント作成
- `join_event` - イベント参加
- `leave_event` - イベント退出
- `update_profile` - プロフィール更新
- `send_message` - メッセージ送信

**リトライ戦略:**
- 最大3回までリトライ
- 3回失敗した場合は諦める（ログに記録）

### 5. ネットワークステータスバー (`src/components/NetworkStatusBar.tsx`)

ネットワーク状態をユーザーに表示するコンポーネント。

```typescript
import { NetworkStatusBar } from '@/components/NetworkStatusBar';

// アプリの上部に配置
<NetworkStatusBar />
```

**表示内容:**
- オンライン時: 何も表示しない（または同期待ちがある場合は件数表示）
- オフライン時: 警告バーを表示（同期待ち件数を表示）
- 同期中: 同期中インジケーターを表示

## 使用例

### イベント一覧画面での使用

```typescript
import { useEventsQuery } from '@/hooks/useEventsQuery';
import { NetworkStatusBar } from '@/components/NetworkStatusBar';

export function EventListScreen() {
  const { events, loading, refetch, isRefreshing } = useEventsQuery();

  return (
    <View>
      <NetworkStatusBar />
      {loading && <ActivityIndicator />}
      <FlatList
        data={events}
        onRefresh={refetch}
        refreshing={isRefreshing}
        renderItem={({ item }) => <EventCard event={item} />}
      />
    </View>
  );
}
```

### オフライン対応のイベント作成

```typescript
import { useCreateEventMutation } from '@/hooks/useEventsQuery';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function CreateEventScreen() {
  const { isOnline, addToOfflineQueue } = useOfflineSync();
  const createEventMutation = useCreateEventMutation();

  const handleCreateEvent = async (eventData) => {
    if (!isOnline) {
      // オフライン時はキューに追加
      await addToOfflineQueue('create_event', eventData);
      Alert.alert(
        '成功',
        'オフラインです。オンライン復帰時に自動的にイベントを作成します。'
      );
      return;
    }

    // オンライン時は通常通り作成
    try {
      await createEventMutation.mutateAsync(eventData);
      Alert.alert('成功', 'イベントを作成しました');
    } catch (error) {
      Alert.alert('エラー', 'イベントの作成に失敗しました');
    }
  };

  return (
    <View>
      {/* フォーム */}
      <Button title="作成" onPress={handleCreateEvent} />
    </View>
  );
}
```

## キャッシュ戦略

### イベント一覧

- **React Query staleTime**: 3分
- **React Query gcTime**: 30分
- **AsyncStorage expiryMs**: 5分
- **戦略**: オフラインファースト、オンライン復帰時に自動再フェッチ

### イベント詳細

- **React Query staleTime**: 3分
- **React Query gcTime**: 30分
- **AsyncStorage expiryMs**: 5分
- **戦略**: オフラインファースト、オンライン復帰時に自動再フェッチ

## デバッグ

### キャッシュ統計を確認

```typescript
import { getCacheStats } from '@/lib/cache';

const stats = await getCacheStats();
console.log('キャッシュ数:', stats.count);
console.log('キャッシュサイズ:', stats.sizeMB, 'MB');
console.log('キャッシュキー:', stats.keys);
```

### オフラインキューを確認

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

const { queueLength, syncOfflineQueue, clearOfflineQueue } = useOfflineSync();

console.log('同期待ちアクション数:', queueLength);

// 手動で同期を実行
await syncOfflineQueue();

// キューをクリア（デバッグ用）
await clearOfflineQueue();
```

## パフォーマンス最適化

1. **インメモリキャッシュ優先**: React Queryのインメモリキャッシュを優先的に使用
2. **バックグラウンド再フェッチ**: ユーザーが古いデータを見ている間にバックグラウンドで更新
3. **ネットワーク復帰時の一括再フェッチ**: オンライン復帰時に全クエリを効率的に再フェッチ
4. **有効期限管理**: 古いキャッシュは自動的に削除される

## ベストプラクティス

1. **キャッシュキーの命名**: 一貫した命名規則を使用（例: `events_list`, `event_detail_${id}`）
2. **有効期限の設定**: データの性質に応じて適切な有効期限を設定
3. **エラーハンドリング**: オフライン時のエラーを適切にユーザーに伝える
4. **ネットワーク状態の表示**: NetworkStatusBarを使用してネットワーク状態を常に表示
5. **手動リフレッシュの提供**: pull-to-refreshなど、ユーザーが手動で更新できる機能を提供

## トラブルシューティング

### キャッシュが更新されない

```typescript
// キャッシュを強制的にクリアして再フェッチ
await removeCache('events_list');
await queryClient.invalidateQueries({ queryKey: ['events'] });
```

### オフライン同期が動作しない

```typescript
// ネットワーク状態を確認
const state = await NetInfo.fetch();
console.log('ネットワーク接続:', state.isConnected);
console.log('インターネット到達可能:', state.isInternetReachable);

// 手動で同期を実行
await syncOfflineQueue();
```

### キャッシュサイズが大きくなりすぎた場合

```typescript
// すべてのキャッシュをクリア
import { clearAllCache } from '@/lib/cache';
await clearAllCache();
```

## 今後の改善案

- [ ] IndexedDB/SQLiteを使用したより高速な永続化
- [ ] 画像キャッシュの最適化
- [ ] バックグラウンド同期（Service Worker）
- [ ] コンフリクト解決戦略（オフライン編集時の衝突処理）
- [ ] キャッシュサイズの上限設定と自動クリーンアップ
