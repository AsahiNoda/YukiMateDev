import FilterScreen from '@/screens/FilterScreen';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function Filter() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    // Hide tab bar when this screen is focused
    console.log('[TabBar Control] (tabs)/search/filter: Hiding tab bar');
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    // Restore tab bar when leaving this screen
    return () => {
      console.log('[TabBar Control] (tabs)/search/filter: Restoring tab bar');
      navigation.getParent()?.setOptions({
        tabBarStyle: { position: 'absolute' },
      });
    };
  }, [navigation]);

  return <FilterScreen />;
}
