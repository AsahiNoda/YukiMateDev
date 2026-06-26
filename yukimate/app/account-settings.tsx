import { RequireAuth } from '@/components/auth/RequireAuth';
import AccountSettingsScreen from '@/screens/AccountSettingsScreen';

export default function AccountSettings() {
  return (
    <RequireAuth>
      <AccountSettingsScreen />
    </RequireAuth>
  );
}
