import { RequireAuth } from '@/components/auth/RequireAuth';
import CreateChannelScreen from '@/screens/channels/CreateChannelScreen';

export default function NewChannel() {
  return (
    <RequireAuth>
      <CreateChannelScreen />
    </RequireAuth>
  );
}
