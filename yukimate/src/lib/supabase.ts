import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://rmdpetmotoafaddkvyrk.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZHBldG1vdG9hZmFkZGt2eXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDc1NzEsImV4cCI6MjA3NDgyMzU3MX0.oaY0nv82XIG8OvHF7Z0q2cYdJFB74s1I-ys00Ab7lp8';

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
    detectSessionInUrl: false,
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