import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables from expo-constants
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL and Anon Key are required. Please check your .env file or app.json extra config.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure auth settings for React Native
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    // Disable realtime for now to avoid WebSocket/TCP issues
    // Can be enabled later when realtime features are needed
    params: {
      eventsPerSecond: 0,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'yukimate-app',
    },
  },
});
