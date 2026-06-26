import ProfileScreen from '@/screens/tabs/ProfileScreen';
import { useLocalSearchParams } from 'expo-router';

export default function UserProfile() {
    const { id } = useLocalSearchParams();
    return <ProfileScreen userId={id as string} />;
}
