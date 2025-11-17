import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://rmdpetmotoafaddkvyrk.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZHBldG1vdG9hZmFkZGt2eXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDc1NzEsImV4cCI6MjA3NDgyMzU3MX0.oaY0nv82XIG8OvHF7Z0q2cYdJFB74s1I-ys00Ab7lp8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});