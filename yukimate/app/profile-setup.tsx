import ProfileSetupScreen from '@/screens/tabs/ProfileSetupScreen';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function ProfileSetup() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    // Hide tab bar when this screen is focused
    console.log('[TabBar Control] profile-setup: Hiding tab bar');
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    // Restore tab bar when leaving this screen
    return () => {
      console.log('[TabBar Control] profile-setup: Restoring tab bar');
      navigation.getParent()?.setOptions({
        tabBarStyle: { position: 'absolute' },
      });
    };
  }, [navigation]);

  return <ProfileSetupScreen />;
}
