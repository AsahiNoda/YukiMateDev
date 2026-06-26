import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

/**
 * ルートインデックス画面
 * アプリ起動時に最初に表示される画面
 * 認証状態に応じて適切な画面にリダイレクトする
 */
export default function Index() {
    const { session, loading } = useAuth();

    // 認証状態を確認中はローディング表示
    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A202C' }}>
                <ActivityIndicator size="large" color="#5A7D9A" />
            </View>
        );
    }

    // セッションがある場合はホーム画面へ、ない場合はログイン画面へ
    if (session) {
        return <Redirect href="/(tabs)/home" />;
    }

    return <Redirect href="/(auth)/sign-in" />;
}
