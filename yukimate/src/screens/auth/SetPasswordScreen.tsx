import { borderRadius, fontSize, fontWeight } from '@/constants/spacing';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/contexts/LocaleContext';
import { validatePassword } from '@/utils/validation';
import { supabase } from '@lib/supabase';

export default function SetPasswordScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { t } = useTranslation();
    const { locale, setLocale } = useLocale();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetPassword = async () => {
        // パスワードのバリデーション
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            Alert.alert(t('common.error'), passwordValidation.error);
            return;
        }

        // パスワード確認
        if (newPassword !== confirmPassword) {
            Alert.alert(t('common.error'), t('auth.passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            // パスワード更新
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                throw error;
            }

            // 確認: プロフィール作成画面へ遷移
            // プロフィールの存在確認（エラーになっても進行を妨げないようにする）
            let hasProfile = false;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // タイムアウト付きでプロフィール確認
                    const checkProfilePromise = supabase
                        .from('profiles')
                        .select('user_id')
                        .eq('user_id', user.id)
                        .single();

                    // 3秒でタイムアウト
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile check timeout')), 3000)
                    );

                    const { data: profile } = await Promise.race([checkProfilePromise, timeoutPromise]) as any;
                    hasProfile = !!profile;
                }
            } catch (err) {
                console.warn('⚠️ [SetPassword] Profile check failed or timed out:', err);
                // チェックに失敗した場合は、念のためプロフィール設定へ遷移させる
                // (ProfileSetupScreen側でもチェックしているので安全)
                hasProfile = false;
            }

            Alert.alert(
                t('common.success'),
                hasProfile
                    ? 'パスワードを設定しました。ホーム画面へ移動します。'
                    : 'パスワードを設定しました。次にプロフィールを設定しましょう。',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (hasProfile) {
                                router.replace('/(tabs)/home');
                            } else {
                                router.replace('/profile-setup');
                            }
                        },
                    },
                ]
            );
        } catch (error: any) {
            console.error('❌ [SetPassword] Error:', error);
            Alert.alert(t('common.error'), error.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = async () => {
        try {
            await setLocale(locale === 'ja' ? 'en' : 'ja');
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 言語切り替えボタン (ResetPasswordScreenと同じスタイル) */}
            <TouchableOpacity
                style={styles.languageButton}
                onPress={toggleLanguage}
                disabled={loading}
            >
                <Text style={[styles.languageButtonText, { color: colors.text }]}>
                    🌐 {locale === 'ja' ? 'EN' : 'JP'}
                </Text>
            </TouchableOpacity>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/images/app_logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.form}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            パスワード設定
                        </Text>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            アカウントのパスワードを設定してください。
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: colors.backgroundSecondary,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    },
                                ]}
                                placeholder={t('auth.newPassword')}
                                placeholderTextColor={colors.textSecondary}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: colors.backgroundSecondary,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    },
                                ]}
                                placeholder={t('auth.confirmPassword')}
                                placeholderTextColor={colors.textSecondary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.primaryButton,
                                { backgroundColor: colors.tint },
                                loading && styles.buttonDisabled,
                            ]}
                            onPress={handleSetPassword}
                            disabled={loading}
                        >
                            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                {loading ? t('common.processing') : '設定して次へ'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.round,
    },
    form: {
        width: '100%',
    },
    title: {
        fontSize: fontSize.title,
        fontWeight: fontWeight.bold,
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: fontSize.sm,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: borderRadius.card,
        padding: 18,
        fontSize: fontSize.md,
        marginBottom: 14,
    },
    button: {
        borderRadius: borderRadius.card,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryButton: {},
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        letterSpacing: 0.3,
    },
    languageButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: borderRadius.glass,
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
    },
    languageButtonText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
    },
});
