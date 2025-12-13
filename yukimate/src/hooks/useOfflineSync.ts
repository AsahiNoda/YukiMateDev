import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

/**
 * オフライン時の操作をキューに保存し、オンライン復帰時に同期するカスタムフック
 */

const OFFLINE_QUEUE_KEY = '@yukimate_offline_queue';

interface OfflineAction {
  id: string;
  type: 'create_event' | 'join_event' | 'leave_event' | 'update_profile' | 'send_message';
  payload: any;
  timestamp: number;
  retryCount: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  // ネットワーク状態を監視
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);

      // オンラインに復帰したら同期を実行
      if (online && !isSyncing) {
        syncOfflineQueue();
      }
    });

    // 初期状態を取得
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
    });

    // キューの長さを確認
    checkQueueLength();

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * オフラインキューに操作を追加
   */
  const addToOfflineQueue = async (
    type: OfflineAction['type'],
    payload: any
  ): Promise<void> => {
    try {
      const queue = await getOfflineQueue();
      const newAction: OfflineAction = {
        id: `${Date.now()}_${Math.random()}`,
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.push(newAction);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      setQueueLength(queue.length);

      console.log(`📥 Added to offline queue: ${type}`);
    } catch (error) {
      console.error('Failed to add to offline queue:', error);
    }
  };

  /**
   * オフラインキューを取得
   */
  const getOfflineQueue = async (): Promise<OfflineAction[]> => {
    try {
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueStr) return [];
      return JSON.parse(queueStr);
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  };

  /**
   * キューの長さを確認
   */
  const checkQueueLength = async () => {
    const queue = await getOfflineQueue();
    setQueueLength(queue.length);
  };

  /**
   * オフラインキューを同期
   */
  const syncOfflineQueue = async (): Promise<void> => {
    if (isSyncing) {
      console.log('⚠️  Already syncing, skipping...');
      return;
    }

    setIsSyncing(true);
    console.log('🔄 Starting offline queue sync...');

    try {
      const queue = await getOfflineQueue();
      if (queue.length === 0) {
        console.log('✅ No offline actions to sync');
        setIsSyncing(false);
        return;
      }

      console.log(`📤 Syncing ${queue.length} offline actions...`);

      const failedActions: OfflineAction[] = [];

      for (const action of queue) {
        try {
          await executeOfflineAction(action);
          console.log(`✅ Synced: ${action.type}`);
        } catch (error) {
          console.error(`❌ Failed to sync: ${action.type}`, error);

          // リトライ回数を増やす
          action.retryCount += 1;

          // 3回まではリトライ
          if (action.retryCount < 3) {
            failedActions.push(action);
          } else {
            console.error(`❌ Giving up on action after 3 retries: ${action.type}`);
          }
        }
      }

      // 失敗したアクションのみキューに保存
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedActions));
      setQueueLength(failedActions.length);

      console.log(`✅ Sync complete. ${queue.length - failedActions.length} succeeded, ${failedActions.length} failed`);
    } catch (error) {
      console.error('❌ Failed to sync offline queue:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * オフラインアクションを実行
   */
  const executeOfflineAction = async (action: OfflineAction): Promise<void> => {
    switch (action.type) {
      case 'create_event':
        await supabase.from('events').insert(action.payload);
        break;

      case 'join_event':
        await supabase.from('event_applications').insert(action.payload);
        break;

      case 'leave_event':
        await supabase
          .from('event_applications')
          .delete()
          .eq('event_id', action.payload.eventId)
          .eq('user_id', action.payload.userId);
        break;

      case 'update_profile':
        await supabase
          .from('profiles')
          .update(action.payload.updates)
          .eq('user_id', action.payload.userId);
        break;

      case 'send_message':
        await supabase.from('event_messages').insert(action.payload);
        break;

      default:
        console.warn(`Unknown offline action type: ${action.type}`);
    }
  };

  /**
   * キューをクリア
   */
  const clearOfflineQueue = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      setQueueLength(0);
      console.log('✅ Offline queue cleared');
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  };

  return {
    isOnline,
    isSyncing,
    queueLength,
    addToOfflineQueue,
    syncOfflineQueue,
    clearOfflineQueue,
  };
}

export default useOfflineSync;
