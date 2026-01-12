import { RequireAuth } from '@/components/auth/RequireAuth';
import StarredUsersScreen from '@/screens/StarredUsersScreen';

export default function StarredUsers() {
  return (
    <RequireAuth>
      <StarredUsersScreen />
    </RequireAuth>
  );
}
