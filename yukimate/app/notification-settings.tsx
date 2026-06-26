import { RequireAuth } from '@/components/auth/RequireAuth';
import NotificationSettingsScreen from '@/screens/NotificationSettingsScreen';

export default function NotificationSettings() {
  return (
    <RequireAuth>
      <NotificationSettingsScreen />
    </RequireAuth>
  );
}
