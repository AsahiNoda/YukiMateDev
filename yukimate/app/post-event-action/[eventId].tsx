import PostEventActionScreen from '@/screens/PostEventActionScreen';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function PostEventAction() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    // Hide tab bar when this screen is focused
    console.log('[TabBar Control] post-event-action/[eventId]: Hiding tab bar');
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    // Restore tab bar when leaving this screen
    return () => {
      console.log('[TabBar Control] post-event-action/[eventId]: Restoring tab bar');
      navigation.getParent()?.setOptions({
        tabBarStyle: { position: 'absolute' },
      });
    };
  }, [navigation]);

  return <PostEventActionScreen />;
}
