import { Stack } from 'expo-router';

export default function DiscoverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
