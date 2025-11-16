/**
 * Development Configuration
 * モックデータとSupabaseを簡単に切り替えるための設定
 */

// ==========================================
// 開発モード設定
// ==========================================
export const DEV_CONFIG = {
    // true: モックデータを使用（高速開発）
    // false: Supabaseを使用（本番に近い環境）
    USE_MOCK_DATA: true,
  
    // デバッグログを表示するか
    ENABLE_DEBUG_LOGS: true,
  
    // Supabase接続テストを起動時に実行するか
    RUN_SUPABASE_TEST_ON_STARTUP: false,
  
    // 認証をスキップ（開発用）
    SKIP_AUTH: false,
  } as const;
  
  /**
   * データソースの種類
   */
  export type DataSource = 'mock' | 'supabase';
  
  /**
   * 現在のデータソースを取得
   */
  export function getDataSource(): DataSource {
    return DEV_CONFIG.USE_MOCK_DATA ? 'mock' : 'supabase';
  }
  
  /**
   * デバッグログを出力（設定に応じて）
   */
  export function devLog(message: string, ...args: any[]) {
    if (DEV_CONFIG.ENABLE_DEBUG_LOGS) {
      const source = getDataSource().toUpperCase();
      console.log(`[${source}] ${message}`, ...args);
    }
  }
  
  /**
   * データソース別のエラーメッセージ
   */
  export function getErrorMessage(error: any): string {
    const source = getDataSource();
    
    if (source === 'mock') {
      return `Mock data error: ${error?.message || 'Unknown error'}`;
    }
    
    return `Supabase error: ${error?.message || 'Unknown error'}`;
  }
  
  /**
   * 開発モードの状態を表示
   */
  export function logDevMode() {
    const source = getDataSource();
    console.log('\n🔧 Development Configuration:');
    console.log(`   Data Source: ${source}`);
    console.log(`   Debug Logs: ${DEV_CONFIG.ENABLE_DEBUG_LOGS ? 'ON' : 'OFF'}`);
    console.log(`   Skip Auth: ${DEV_CONFIG.SKIP_AUTH ? 'YES' : 'NO'}`);
    console.log('');
  }