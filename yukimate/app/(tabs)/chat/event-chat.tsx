import EventChatScreen from '@/screens/EventChatScreen';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function EventChat() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    // Hide tab bar when this screen is focused
    console.log('[TabBar Control] (tabs)/chat/event-chat: Hiding tab bar');
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    // Restore tab bar when leaving this screen
    return () => {
      console.log('[TabBar Control] (tabs)/chat/event-chat: Restoring tab bar');
      navigation.getParent()?.setOptions({
        tabBarStyle: { position: 'absolute' },
      });
    };
  }, [navigation]);

  return <EventChatScreen />;
}
