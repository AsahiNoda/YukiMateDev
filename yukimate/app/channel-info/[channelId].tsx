import { RequireAuth } from '@/components/auth/RequireAuth';
import ChannelInfoScreen from '@/screens/channels/ChannelInfoScreen';

export default function ChannelInfo() {
  return (
    <RequireAuth>
      <ChannelInfoScreen />
    </RequireAuth>
  );
}
