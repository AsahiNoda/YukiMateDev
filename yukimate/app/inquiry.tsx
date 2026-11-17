import { RequireAuth } from '@/components/auth/RequireAuth';
import InquiryScreen from '@/screens/InquiryScreen';

export default function Inquiry() {
  return (
    <RequireAuth>
      <InquiryScreen />
    </RequireAuth>
  );
}
