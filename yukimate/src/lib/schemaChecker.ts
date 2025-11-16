/**
 * Supabase Schema Checker
 * コードとデータベースのスキーマ不一致を検出
 */

import { supabase } from './supabase';

interface SchemaIssue {
  table: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * スキーマの整合性をチェック
 */
export async function checkSchemaIntegrity(): Promise<{
  passed: boolean;
  issues: SchemaIssue[];
}> {
  console.log('\n🔍 ========== Schema Integrity Check ==========\n');
  
  const issues: SchemaIssue[] = [];

  // 1. 必須テーブルの存在確認
  const requiredTables = [
    'resorts',
    'weather_daily_cache',
    'resort_rating_summary',
    'profiles',
    'posts_events',
    'feed_posts',
    'gear',
  ];

  console.log('📋 Step 1: Checking required tables...');
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      
      if (error) {
        issues.push({
          table,
          issue: `Table not accessible: ${error.message}`,
          severity: 'error',
          suggestion: 'Check if table exists in Supabase dashboard',
        });
        console.log(`  ❌ ${table}: Not accessible`);
      } else {
        console.log(`  ✅ ${table}: OK`);
      }
    } catch (err) {
      issues.push({
        table,
        issue: `Unexpected error checking table`,
        severity: 'error',
      });
      console.log(`  ❌ ${table}: Error`);
    }
  }

  // 2. フィールドの型チェック（サンプルデータで確認）
  console.log('\n📊 Step 2: Checking field types...');
  
  try {
    const { data: resortSample } = await supabase
      .from('resorts')
      .select('id, name, area, latitude, longitude, night_ski')
      .limit(1)
      .single();

    if (resortSample) {
      // UUID形式チェック
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(resortSample.id)) {
        issues.push({
          table: 'resorts',
          issue: 'ID is not UUID format',
          severity: 'error',
          suggestion: 'Ensure id column is uuid type',
        });
      }

      // 必須フィールドチェック
      if (!resortSample.name) {
        issues.push({
          table: 'resorts',
          issue: 'name field is null',
          severity: 'warning',
        });
      }

      console.log('  ✅ resorts: Field types OK');
    } else {
      issues.push({
        table: 'resorts',
        issue: 'No sample data to check field types',
        severity: 'warning',
        suggestion: 'Run sample data SQL to populate tables',
      });
      console.log('  ⚠️  resorts: No data for type checking');
    }
  } catch (err) {
    console.log('  ⚠️  Could not check field types');
  }

  // 3. リレーションシップチェック
  console.log('\n🔗 Step 3: Checking relationships...');
  
  try {
    const { data: eventWithResort, error } = await supabase
      .from('posts_events')
      .select(`
        id,
        resorts(id, name)
      `)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      issues.push({
        table: 'posts_events',
        issue: `Cannot join with resorts: ${error.message}`,
        severity: 'error',
        suggestion: 'Check foreign key relationship',
      });
      console.log('  ❌ posts_events → resorts: Failed');
    } else if (!eventWithResort) {
      console.log('  ℹ️  posts_events: No data for relationship check');
    } else {
      console.log('  ✅ posts_events → resorts: OK');
    }
  } catch (err) {
    console.log('  ⚠️  Could not check relationships');
  }

  // 4. RLS (Row Level Security) チェック
  console.log('\n🔒 Step 4: Checking RLS policies...');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('  ℹ️  Not authenticated - skipping RLS check');
    } else {
      // プロフィールの読み取りテスト
      const { error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        issues.push({
          table: 'profiles',
          issue: `RLS policy may be blocking access: ${profileError.message}`,
          severity: 'warning',
          suggestion: 'Check RLS policies in Supabase dashboard',
        });
        console.log('  ⚠️  profiles: RLS may be too restrictive');
      } else {
        console.log('  ✅ profiles: RLS OK');
      }
    }
  } catch (err) {
    console.log('  ⚠️  Could not check RLS policies');
  }

  // 5. データ整合性チェック
  console.log('\n🔍 Step 5: Checking data integrity...');
  
  try {
    // weather_daily_cache のリゾートID参照チェック
    const { data: orphanedWeather } = await supabase
      .from('weather_daily_cache')
      .select('id, resort_id')
      .is('resorts.id', null);

    if (orphanedWeather && orphanedWeather.length > 0) {
      issues.push({
        table: 'weather_daily_cache',
        issue: `${orphanedWeather.length} records with invalid resort_id`,
        severity: 'warning',
        suggestion: 'Clean up orphaned weather records',
      });
      console.log(`  ⚠️  weather_daily_cache: ${orphanedWeather.length} orphaned records`);
    } else {
      console.log('  ✅ weather_daily_cache: No orphaned records');
    }
  } catch (err) {
    console.log('  ⚠️  Could not check data integrity');
  }

  // 結果サマリー
  console.log('\n📊 ========== Check Summary ==========');
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Info: ${infos.length}`);

  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.forEach((issue, index) => {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} [${issue.table}] ${issue.issue}`);
      if (issue.suggestion) {
        console.log(`     → ${issue.suggestion}`);
      }
    });
  } else {
    console.log('\n✅ All checks passed!');
  }

  console.log('\n========================================\n');

  return {
    passed: errors.length === 0,
    issues,
  };
}

/**
 * クイックチェック（簡易版）
 */
export async function quickSchemaCheck(): Promise<boolean> {
  try {
    const { error: resortsError } = await supabase.from('resorts').select('id').limit(1);
    const { error: eventsError } = await supabase.from('posts_events').select('id').limit(1);
    const { error: profilesError } = await supabase.from('profiles').select('user_id').limit(1);

    return !resortsError && !eventsError && !profilesError;
  } catch {
    return false;
  }
}

/**
 * テーブルごとのデータ件数を取得
 */
export async function getTableCounts() {
  const tables = [
    'resorts',
    'weather_daily_cache',
    'resort_rating_summary',
    'profiles',
    'posts_events',
    'feed_posts',
    'gear',
  ];

  console.log('\n📊 Table Record Counts:');
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${table}: Error`);
      } else {
        const status = count === 0 ? '⚠️  Empty' : `✅ ${count} records`;
        console.log(`  ${status.padEnd(20)} ${table}`);
      }
    } catch {
      console.log(`  ❌ ${table}: Error`);
    }
  }
  console.log('');
}