import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 環境変数から読み込み（app.config.ts経由）
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// デバッグ情報を出力（セキュリティのため値の長さのみ）
console.log('🔍 [Supabase] Environment variable check:');
console.log('  - Constants.expoConfig?.extra?.supabaseUrl:', Constants.expoConfig?.extra?.supabaseUrl ? `${Constants.expoConfig.extra.supabaseUrl.length} chars` : 'undefined');
console.log('  - Constants.expoConfig?.extra?.supabaseAnonKey:', Constants.expoConfig?.extra?.supabaseAnonKey ? `${Constants.expoConfig.extra.supabaseAnonKey.length} chars` : 'undefined');
console.log('  - process.env.EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? `${process.env.EXPO_PUBLIC_SUPABASE_URL.length} chars` : 'undefined');
console.log('  - process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length} chars` : 'undefined');
console.log('  - Final supabaseUrl:', supabaseUrl ? `${supabaseUrl.length} chars` : 'empty');
console.log('  - Final supabaseAnonKey:', supabaseAnonKey ? `${supabaseAnonKey.length} chars` : 'empty');

// 環境変数が設定されているか検証
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Supabase URL and Anon Key are required. Please check your environment variables and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in EAS Secrets.';

  // 環境変数がない場合は必ずエラーをthrow（開発・本番問わず）
  // これにより、空の値でcreateClient()が呼ばれることを防ぐ
  console.error('❌ [Supabase]', errorMessage);
  console.error('❌ [Supabase] Debug info:');
  console.error('   - __DEV__:', __DEV__);
  console.error('   - Constants.expoConfig?.extra:', JSON.stringify(Constants.expoConfig?.extra, null, 2));
  console.error('❌ [Supabase] To fix this, run:');
  console.error('   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "your_url"');
  console.error('   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_key"');

  throw new Error(errorMessage);
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