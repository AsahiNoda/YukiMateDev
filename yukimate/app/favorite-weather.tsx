import { RequireAuth } from '@/components/auth/RequireAuth';
import FavoriteResortsWeatherScreen from '@/screens/FavoriteResortsWeatherScreen';

export default function FavoriteWeather() {
  return (
    <RequireAuth>
      <FavoriteResortsWeatherScreen />
    </RequireAuth>
  );
}
