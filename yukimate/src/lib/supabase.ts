import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 環境変数から読み込み（app.config.ts経由）
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// 環境変数が設定されているか検証（開発時のみthrow、本番時はコンソールログのみ）
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Supabase URL and Anon Key are required. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.';

  if (__DEV__) {
    // 開発時は明示的にエラーをthrow
    throw new Error(errorMessage);
  } else {
    // 本番時はコンソールエラーのみ（クラッシュを防ぐ）
    console.error('❌ [Supabase]', errorMessage);
    console.error('❌ [Supabase] App may not function properly without valid credentials');
  }
}

// カスタムfetch関数でタイムアウトを実装
const fetchWithTimeout = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  const timeout = 15000; // 15秒タイムアウト

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.error('[Supabase] Request timeout after', timeout, 'ms');
      throw new Error('ネットワークタイムアウト: 接続が遅すぎます');
    }
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Deep linkからのセッションを検出（パスワードリセット用）
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-react-native',
    },
    fetch: fetchWithTimeout,
  },
  db: {
    schema: 'public',
  },
});

// グローバルエラーハンドラー: Invalid Refresh Tokenエラーを検出
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    console.log('🔓 Supabase: User signed out');
  }
  if (event === 'TOKEN_REFRESHED') {
    if (!session) {
      console.error('❌ Supabase: Token refresh failed - session is null');
      console.log('🔄 Supabase: Clearing invalid session...');
      supabase.auth.signOut().catch(e => console.error('Error during auto signOut:', e));
    }
  }
});