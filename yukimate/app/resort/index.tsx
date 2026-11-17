import { RequireAuth } from '@/components/auth/RequireAuth';
import { parseResortPageParams } from '@/navigation/resortPage';
import SnowfeedScreen from '@/screens/tabs/SnowfeedScreen';
import { useLocalSearchParams } from 'expo-router';

/**
 * ゲレンデページ（ホームゲレンデ）。ゲレンデIDなしで開くとホームゲレンデを表示し、
 * 未設定ならホームゲレンデの設定から始める。
 * 引数：tab=posts|forecast|ratings（最初に開くタブ）
 */
export default function HomeResortPage() {
  const params = useLocalSearchParams<{ tab?: string }>();
  return (
    <RequireAuth>
      <SnowfeedScreen {...parseResortPageParams(params)} />
    </RequireAuth>
  );
}
