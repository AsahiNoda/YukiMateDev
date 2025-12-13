import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

/**
 * React QueryのQueryClientを設定
 * オフライン対応とキャッシュ戦略を含む
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // データの再フェッチ戦略
      staleTime: 1000 * 60 * 5, // 5分間はデータを"fresh"と見なす
      gcTime: 1000 * 60 * 60 * 24, // 24時間キャッシュを保持（旧cacheTime）

      // ネットワークモード設定
      networkMode: 'offlineFirst', // オフライン時もキャッシュから返す

      // リトライ設定
      retry: (failureCount, error: any) => {
        // ネットワークエラーの場合は3回までリトライ
        if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
          return failureCount < 3;
        }
        // その他のエラーは1回だけリトライ
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ

      // 自動リフレッシュ設定
      refetchOnWindowFocus: true, // アプリがフォアグラウンドに戻ったときに再フェッチ
      refetchOnReconnect: true, // ネットワーク再接続時に再フェッチ
      refetchOnMount: true, // コンポーネントマウント時に再フェッチ
    },
    mutations: {
      // ミューテーションのネットワークモード
      networkMode: 'online', // オンライン時のみミューテーションを実行

      // リトライ設定（ミューテーションは通常リトライしない）
      retry: false,
    },
  },
});

/**
 * ネットワーク状態を監視してReact Queryに通知
 */
let unsubscribe: (() => void) | undefined;

export const setupNetworkListener = () => {
  // すでにリスナーが設定されている場合は解除
  if (unsubscribe) {
    unsubscribe();
  }

  // ネットワーク状態の変化を監視
  unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected && state.isInternetReachable !== false;

    console.log(`🌐 Network status: ${isOnline ? 'Online' : 'Offline'}`);

    // React Queryにオンライン状態を通知
    queryClient.setOnlineMode(isOnline);

    // オンラインに復帰したら、すべてのクエリを再フェッチ
    if (isOnline) {
      console.log('🔄 Network reconnected, refetching queries...');
      queryClient.refetchQueries();
    }
  });
};

/**
 * クリーンアップ関数
 */
export const cleanupNetworkListener = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = undefined;
  }
};

/**
 * QueryProviderコンポーネント
 */
interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  React.useEffect(() => {
    // ネットワークリスナーをセットアップ
    setupNetworkListener();

    // クリーンアップ
    return () => {
      cleanupNetworkListener();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// queryClientをエクスポート（他の場所で使用できるように）
export { queryClient };

export default QueryProvider;
