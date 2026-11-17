import { supabase } from '@/lib/supabase';
import type { UserGear, UserRole } from '@/types';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

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
  // プロフィール取得済みのユーザーID（同一ユーザーのトークン更新等で再取得しないため）
  const loadedUserIdRef = useRef<string | null>(null);
  // 取得中のリクエスト（起動直後の getSession と SIGNED_IN の重複取得を防ぐ）
  const inFlightLoadRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  useEffect(() => {
    // セッション確認
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Invalid Refresh Tokenエラーをキャッチ
      if (error) {
        console.error('❌ AuthContext: Error getting session:', error);
        if (error.message?.includes('Invalid Refresh Token') ||
            error.message?.includes('Refresh Token Not Found')) {
          console.log('🔄 AuthContext: Invalid refresh token detected, signing out...');
          // 無効なトークンをクリアしてサインアウト
          supabase.auth.signOut().catch(e => console.error('Error during signOut:', e));
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔔 AuthContext: Auth event: ${event}, Has session: ${!!session}`);

        // INITIAL_SESSION は上の getSession() で処理済みなので二重取得しない
        if (event === 'INITIAL_SESSION') return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // 同じユーザーでプロフィール取得済みなら再取得しない
          // （TOKEN_REFRESHED や復帰時の SIGNED_IN で毎回3クエリ走るのを防ぐ）
          if (loadedUserIdRef.current === session.user.id && event !== 'USER_UPDATED') {
            return;
          }
          loadUserData(session.user.id);
        } else {
          loadedUserIdRef.current = null;
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /** プロフィールとロールを並列取得（同一ユーザーの取得中は同じPromiseを共有） */
  function loadUserData(userId: string): Promise<void> {
    const inFlight = inFlightLoadRef.current;
    if (inFlight && inFlight.userId === userId) {
      return inFlight.promise;
    }
    const promise = Promise.all([fetchProfile(userId), fetchUserRole(userId)])
      .then(() => undefined)
      .finally(() => {
        if (inFlightLoadRef.current?.promise === promise) {
          inFlightLoadRef.current = null;
        }
      });
    inFlightLoadRef.current = { userId, promise };
    return promise;
  }

  async function fetchProfile(userId: string) {
    try {
      console.log('⏳ [AuthContext] Fetching profile...');

      // タイムアウト処理を追加（5秒）
      // profiles と gear は互いに依存しないので並列に取得する
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const gearPromise = supabase
        .from('gear')
        .select('board_name, binding_name, boots_name, others')
        .eq('user_id', userId)
        .maybeSingle();

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
      });

      const [{ data, error }, { data: gearData }] = await Promise.race([
        Promise.all([profilePromise, gearPromise]),
        timeoutPromise,
      ]).finally(() => clearTimeout(timeoutId)) as any;

      if (error) {
        // プロフィールが存在しない場合
        if (error.code === 'PGRST116') {
          setProfile(null);
        } else {
          throw error;
        }
      } else if (data) {
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
        loadedUserIdRef.current = userId;
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

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('User role fetch timeout')), 5000);
      });

      const { data, error } = await Promise.race([
        rolePromise,
        timeoutPromise,
      ]).finally(() => clearTimeout(timeoutId)) as any;

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // メール確認後の自動ログインを無効化
      },
    });

    if (error) {
      // Database error handling
      if (error.message.includes('Database error')) {
        throw new Error('データベースエラーが発生しました。管理者に連絡してください。');
      }
      throw error;
    }

    // メール確認が必要な場合、セッションは作成されない
    // data.user は存在するが、data.session は null になる
    if (data.user && !data.session) {
      console.log('✅ User created, email confirmation required');
      // メール確認が必要な場合は何もしない（AuthScreenでアラート表示）
    } else if (data.session) {
      // 自動ログインされた場合（メール確認不要の設定の場合）
      console.log('⚠️ User auto-logged in without email confirmation');
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Invalid Login Credentialsエラーの場合、分かりやすいメッセージに変換
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }
      throw error;
    }
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
      await loadUserData(user.id);
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