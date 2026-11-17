import { RequireAuth } from '@/components/auth/RequireAuth';
import { parseResortPageParams } from '@/navigation/resortPage';
import SnowfeedScreen from '@/screens/tabs/SnowfeedScreen';
import { useLocalSearchParams } from 'expo-router';

/**
 * ゲレンデページ（任意のゲレンデ）。どの入口から来ても同じ画面で、最初に開くタブだけ変える。
 * 例：router.push({ pathname: '/resort/[resortId]', params: { resortId, tab: 'forecast' } })
 */
export default function ResortPage() {
  const params = useLocalSearchParams<{ resortId: string; tab?: string }>();
  return (
    <RequireAuth>
      <SnowfeedScreen resortId={params.resortId} {...parseResortPageParams(params)} />
    </RequireAuth>
  );
}
