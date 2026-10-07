import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Keyboard, Platform, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import '../../local/i18n'; // ← nur hier
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveKeyboardHeight } from '../../inc/keyboardStorage';

// Außerhalb platzieren, damit es nur einmal beim App-Start konfiguriert wird
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // iOS nutzt 'keyboardWillShow' für flüssiges Mitgehen, Android 'keyboardDidShow'
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      console.log(`Keyboard height detected: ${height}`);
      if (height > 0) {
        saveKeyboardHeight(height);
      }
    });

    return () => {
      showSubscription.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2e7b88ff',
        headerShown: false,
        tabBarButton: HapticTab,
        // Verhindert auf Android das Hochdrücken der Tab Bar durch die Tastatur
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Anlagen',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="arrow.up.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}