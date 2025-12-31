import { supabase } from '@/lib/supabase';
import type { UserGear, UserRole } from '@/types';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// AppUser type for AuthContext
interface AppUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  countryCode: string | null;
  ageRange: string | null;
  skillLevel: string | null;
  ridingStyle: string[];
  gearInfo: UserGear | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  userRole: UserRole | null;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  enableGuestMode: () => void;
  isDeveloper: () => boolean;
  isOfficial: () => boolean;
  isUser: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // セッション確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔔 AuthContext: Auth event: ${event}, Has session: ${!!session}`);
        console.log(`🔔 AuthContext: User email: ${session?.user?.email}`);
        console.log(`🔔 AuthContext: Session type: ${session?.user?.app_metadata?.provider}`);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log(`🔔 AuthContext: Fetching profile for user: ${session.user.id}`);
          await fetchProfile(session.user.id);
          console.log(`🔔 AuthContext: Fetching role for user: ${session.user.id}`);
          await fetchUserRole(session.user.id);
          console.log(`🔔 AuthContext: Profile and role fetch complete`);
        } else {
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      console.log('⏳ [AuthContext] Fetching profile...');

      // タイムアウト処理を追加（5秒）
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
      });

      const { data, error } = await Promise.race([
        profilePromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        // プロフィールが存在しない場合
        if (error.code === 'PGRST116') {
          setProfile(null);
        } else {
          throw error;
        }
      } else if (data) {
        // Fetch gear information
        const { data: gearData } = await supabase
          .from('gear')
          .select('board_name, binding_name, boots_name, others')
          .eq('user_id', userId)
          .single();

        const appUser: AppUser = {
          id: data.user_id,
          username: data.display_name || 'ユーザー',
          displayName: data.display_name || 'ユーザー',
          avatar: data.avatar_url,
          countryCode: data.country_code,
          ageRange: null,
          skillLevel: data.level,
          ridingStyle: data.styles || [],
          gearInfo: gearData ? {
            board: gearData.board_name,
            binding: gearData.binding_name,
            boots: gearData.boots_name,
            others: gearData.others,
          } : null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setProfile(appUser);
      }
    } catch (error: any) {
      if (error.message === 'Profile fetch timeout') {
        console.warn('⚠️ [AuthContext] Profile fetch timed out, continuing without profile');
        setProfile(null);
      } else {
        console.error('Error fetching profile:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserRole(userId: string) {
    try {
      console.log('⏳ [AuthContext] Fetching user role...');

      // タイムアウト処理を追加（5秒）
      const rolePromise = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('User role fetch timeout')), 5000);
      });

      const { data, error } = await Promise.race([
        rolePromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        // PGRST116 = レコードが見つからない
        if (error.code === 'PGRST116') {
          console.warn('⚠️  User record not found in public.users. Defaulting to "user" role.');
          console.warn('   Please set up the Supabase trigger to automatically create user records.');
          setUserRole('user'); // デフォルトロール
        } else {
          console.error('Error fetching user role:', error);
          setUserRole('user'); // エラー時もデフォルトロール
        }
      } else if (data) {
        setUserRole(data.role as UserRole);
      }
    } catch (error: any) {
      if (error.message === 'User role fetch timeout') {
        console.warn('⚠️ [AuthContext] User role fetch timed out, using default role');
        setUserRole('user');
      } else {
        console.error('Error fetching user role:', error);
        setUserRole('user'); // エラー時もデフォルトロール
      }
    }
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      // Ignore AuthSessionMissingError as it means we're already signed out
      if (error instanceof Error && (
        error.message.includes('Auth session missing') ||
        error.name === 'AuthSessionMissingError'
      )) {
        console.log('Auth session missing, proceeding with sign out cleanup');
      } else {
        throw error;
      }
    } finally {
      setIsGuest(false); // サインアウト時にゲストモードを解除
    }
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
      await fetchUserRole(user.id);
    }
  }

  function enableGuestMode() {
    setIsGuest(true);
    setLoading(false);
  }

  // ロール確認のヘルパー関数
  function isDeveloper(): boolean {
    return userRole === 'developer';
  }

  function isOfficial(): boolean {
    return userRole === 'official';
  }

  function isUser(): boolean {
    return userRole === 'user';
  }

  const value = {
    session,
    user,
    profile,
    userRole,
    loading,
    isGuest,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    enableGuestMode,
    isDeveloper,
    isOfficial,
    isUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}