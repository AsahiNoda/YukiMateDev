import { RequireAuth } from '@/components/auth/RequireAuth';
import MyPostsScreen from '@/screens/tabs/MyPostsScreen';

export default function MyPosts() {
  return (
    <RequireAuth>
      <MyPostsScreen />
    </RequireAuth>
  );
}
