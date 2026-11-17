import { RequireAuth } from '@/components/auth/RequireAuth';
import ChannelScreen from '@/screens/channels/ChannelScreen';

export default function Channel() {
  return (
    <RequireAuth>
      <ChannelScreen />
    </RequireAuth>
  );
}
