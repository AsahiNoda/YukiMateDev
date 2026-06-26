import { RequireAuth } from '@/components/auth/RequireAuth';
import BlockedUsersScreen from '@/screens/BlockedUsersScreen';

export default function BlockedUsers() {
  return (
    <RequireAuth>
      <BlockedUsersScreen />
    </RequireAuth>
  );
}
