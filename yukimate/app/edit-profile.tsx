import { RequireAuth } from '@/components/auth/RequireAuth';
import EditProfileScreen from '@/screens/EditProfileScreen';

export default function EditProfile() {
  return (
    <RequireAuth>
      <EditProfileScreen />
    </RequireAuth>
  );
}
