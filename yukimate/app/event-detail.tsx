import { Stack } from 'expo-router';
import EventDetailScreen from '@/screens/EventDetailScreen';

export default function EventDetail() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <EventDetailScreen />
    </>
  );
}
