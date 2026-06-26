import { RequireAuth } from '@/components/auth/RequireAuth';
import SettingsScreen from '@/screens/SettingsScreen';

export default function Settings() {
  return (
    <RequireAuth>
      <SettingsScreen />
    </RequireAuth>
  );
}
