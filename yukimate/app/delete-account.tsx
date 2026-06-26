import { RequireAuth } from '@/components/auth/RequireAuth';
import DeleteAccountScreen from '@/screens/DeleteAccountScreen';

export default function DeleteAccount() {
  return (
    <RequireAuth>
      <DeleteAccountScreen />
    </RequireAuth>
  );
}
