/**
 * Supabase connection test utility
 * Run this to verify Supabase connection is working
 */

import { supabase } from './supabase';

export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');

  try {
    // Test 1: Check if we can connect to Supabase
    const { data: resorts, error: resortsError } = await supabase
      .from('resorts')
      .select('id, name')
      .limit(5);

    if (resortsError) {
      console.error('❌ Failed to fetch resorts:', resortsError.message);
      return { success: false, error: resortsError.message };
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log(`📍 Found ${resorts?.length || 0} resorts:`, resorts?.map(r => r.name));

    // Test 2: Check auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn('⚠️ Session check failed:', sessionError.message);
    } else if (session) {
      console.log('👤 Active session found for user:', session.user.id);
    } else {
      console.log('👤 No active session (user not logged in)');
    }

    return {
      success: true,
      resortsCount: resorts?.length || 0,
      hasSession: !!session,
    };
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
