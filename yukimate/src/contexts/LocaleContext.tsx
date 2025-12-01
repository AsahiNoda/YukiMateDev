import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const LOCALE_STORAGE_KEY = '@app_locale';

export type Locale = 'ja' | 'en';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => Promise<void>;
    loading: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('ja'); // デフォルトは日本語
    const [loading, setLoading] = useState(true);

    // 初期化：AsyncStorageまたはプロフィールから言語を読み込む
    useEffect(() => {
        loadLocale();
    }, []);

    async function loadLocale() {
        try {
            // 1. AsyncStorageから読み込み
            const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
            if (stored === 'ja' || stored === 'en') {
                setLocaleState(stored);
                setLoading(false);
                return;
            }

            // 2. ログインユーザーのプロフィールから読み込み
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('languages')
                    .eq('user_id', session.user.id)
                    .single();

                if (profile?.languages && profile.languages.length > 0) {
                    const lang = profile.languages[0];
                    // "ja" または "en" に正規化
                    const normalizedLang: Locale = lang === 'en' || lang === 'English' ? 'en' : 'ja';
                    setLocaleState(normalizedLang);
                    // AsyncStorageに保存
                    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, normalizedLang);
                }
            }
        } catch (error) {
            console.error('Error loading locale:', error);
        } finally {
            setLoading(false);
        }
    }

    async function setLocale(newLocale: Locale) {
        try {
            // 1. ステートを更新
            setLocaleState(newLocale);

            // 2. AsyncStorageに保存
            await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

            // 3. プロフィールを更新
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase
                    .from('profiles')
                    .update({ languages: [newLocale] })
                    .eq('user_id', session.user.id);
            }
        } catch (error) {
            console.error('Error setting locale:', error);
            throw error;
        }
    }

    return (
        <LocaleContext.Provider value={{ locale, setLocale, loading }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    const context = useContext(LocaleContext);
    if (context === undefined) {
        throw new Error('useLocale must be used within a LocaleProvider');
    }
    return context;
}
