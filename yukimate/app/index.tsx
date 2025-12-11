import { Redirect } from 'expo-router';

/**
 * ルートインデックス画面
 * アプリ起動時に最初に表示される画面
 * RootLayoutで認証チェックが完了するまでの間、この画面が表示される
 */
export default function Index() {
    // RootLayoutが適切な画面にリダイレクトするまで、
    // ホーム画面にリダイレクト
    return <Redirect href="/(tabs)/home" />;
}
