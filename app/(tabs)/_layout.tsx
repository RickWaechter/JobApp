import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import '../../local/i18n';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { saveKeyboardHeight } from '../../inc/keyboardStorage';

SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

const TAB_YELLOW = '#ecbc38'; // entspricht hsl(44, 88%, 61%)
const TAB_BG = '#082b5a';
const TAB_YELLOW_INTERACTIVE = '#ecbc389a';

export default function TabLayout() {
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
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
        tabBarActiveTintColor: TAB_YELLOW,
        tabBarInactiveTintColor: TAB_YELLOW_INTERACTIVE,
       tabBarStyle: {
      backgroundColor: TAB_BG,
      borderTopWidth: 0,      // Entfernt die Linie auf iOS & Android
      borderTopColor: 'transparent',
      elevation: 0,           // Entfernt den oberen Schatten/Strich auf Android
      shadowOpacity: 0,       // Entfernt den oberen Schatten auf iOSn
        height:52,
      paddingBottom:10
    },
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' },
        headerStyle: { backgroundColor: TAB_BG },
        headerShown: false,
        tabBarButton: HapticTab,
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
      <Tabs.Screen
        name="test"
        options={{
          title: 'Test',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="arrow.up.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}