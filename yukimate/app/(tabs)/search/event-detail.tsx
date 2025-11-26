import EventDetailScreen from '@/screens/EventDetailScreen';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function EventDetail() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    // Hide tab bar when this screen is focused
    console.log('[TabBar Control] (tabs)/search/event-detail: Hiding tab bar');
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    // Restore tab bar when leaving this screen
    return () => {
      console.log('[TabBar Control] (tabs)/search/event-detail: Restoring tab bar');
      navigation.getParent()?.setOptions({
        tabBarStyle: { position: 'absolute' },
      });
    };
  }, [navigation]);

  return <EventDetailScreen />;
}
