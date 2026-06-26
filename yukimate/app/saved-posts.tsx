import { RequireAuth } from '@/components/auth/RequireAuth';
import SavedPostsScreen from '@/screens/tabs/SavedPostsScreen';

export default function SavedPosts() {
  return (
    <RequireAuth>
      <SavedPostsScreen />
    </RequireAuth>
  );
}
