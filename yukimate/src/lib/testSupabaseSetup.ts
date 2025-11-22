/**
 * Supabase Connection Test & Debug Helper
 *
 * 使い方:
 * 1. HomeScreen.tsx などで import { testSupabaseSetup } from '@lib/testSupabaseSetup';
 * 2. useEffect で testSupabaseSetup() を呼び出す
 * 3. コンソールログで詳細な診断情報を確認
 */

import Constants from 'expo-constants';
import { supabase } from './supabase';

export async function testSupabaseSetup() {
  console.log('\n🔍 ========== Supabase Setup Test ==========');

  // Step 1: 環境変数チェック
  console.log('\n📋 Step 1: Environment Variables');
  const url = Constants.expoConfig?.extra?.supabaseUrl;
  const key = Constants.expoConfig?.extra?.supabaseAnonKey;

  console.log('  Supabase URL:', url ? '✅ Set' : '❌ Missing');
  console.log('  Anon Key:', key ? '✅ Set' : '❌ Missing');

  if (!url || !key) {
    console.error('❌ Supabase credentials not configured in app.json');
    return { success: false, error: 'Missing credentials' };
  }

  // Step 2: テーブルへの接続テスト　好きなテーブルに変えてテスト
  console.log('\n📊 Step 2: Database Connection Test');
  try {
    // posts_eventsテーブルのテスト
    const { data: posts_events, error: posts_eventsError } = await supabase
      .from('posts_events')
      .select('id, title')
      .limit(10);

    if (posts_eventsError) {
      console.error('❌ posts_events query failed:', posts_eventsError.message);
      console.error('   Details:', posts_eventsError);
      return { success: false, error: posts_eventsError.message };
    }

    // リゾートのテスト
    const { data: resorts, error: resortsError } = await supabase
      .from('resorts')
      .select('id, name')

    if (resortsError) {
      console.warn('⚠️  resorts query failed:', resortsError.message);
      console.error('   Details:', resortsError);
      return { success: false, error: resortsError.message };
    }

    // 接続成功
    console.log('✅ Successfully connected to database');

    // posts_eventsテーブルテスト結果
    console.log(`   Found ${posts_events?.length || 0} posts_events:`);
    posts_events?.forEach(r => console.log(`     - ${r.title}`));
    if (!posts_events || posts_events.length === 0) {
      console.warn('⚠️  No data found in posts_events table');
    }

    // リゾートテーブルテスト結果
    console.log(`   Found ${resorts?.length || 0} resorts:`);
    if (!resorts || resorts.length === 0) {
      console.warn('⚠️  No data found in resorts table');
    }

  } catch (err) {
    console.error('❌ Database connection error:', err);
    return { success: false, error: String(err) };
  }

  // Step 3: 認証状態チェック
  console.log('\n👤 Step 3: Authentication Status');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Auth check failed:', error.message);
    } else if (session) {
      console.log('✅ User authenticated');
      console.log(`   User ID: ${session.user.id}`);
      console.log(`   Email: ${session.user.email}`);
    } else {
      console.log('ℹ️  No active session (user not logged in)');
    }
  } catch (err) {
    console.error('❌ Auth error:', err);
  }

  // Step 4: プロフィールテーブルチェック（認証済みの場合）
  console.log('\n📝 Step 4: Profile Check');
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Profile query failed:', error.message);
      } else if (!profile) {
        console.warn('⚠️  Profile not found for current user');
        console.warn('   Check profile data in Supabase Dashboard');
      } else {
        console.log('✅ Profile found');
        // 出したいテーブルログは自由に変更
        console.log(`   Display Name: ${profile.display_name || 'Not set'}`);
        console.log(`   Home Resort: ${profile.home_resort_id || 'Not set'}`);
      }
    } else {
      console.log('ℹ️  Skipping profile check (not authenticated)');
    }
  } catch (err) {
    console.error('❌ Profile check error:', err);
  }

  console.log('\n✅ ========== Test Complete ==========\n');
  return { success: true };
}

/**
 * Quick check - just verifies basic connectivity
 */
export async function quickSupabaseCheck(): Promise<boolean> {
  try {
    const { error } = await supabase.from('posts_events').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Check if tables have data
 */
export async function checkTablesHaveData() {
  const tables = ['posts_events', 'resorts', 'posts_events', 'feed_posts'];
  const results: Record<string, number> = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      results[table] = error ? -1 : (count || 0);
    } catch {
      results[table] = -1;
    }
  }

  console.log('\n📊 Table Data Status:');
  Object.entries(results).forEach(([table, count]) => {
    const status = count === -1 ? '❌ Error' : count === 0 ? '⚠️  Empty' : `✅ ${count} rows`;
    console.log(`   ${table}: ${status}`);
  });

  return results;
}
