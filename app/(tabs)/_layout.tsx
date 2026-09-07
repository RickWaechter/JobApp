import { Tabs } from 'expo-router';
import React from 'react';
import "../../local/i18n"; // ← nur hier
import * as SplashScreen from 'expo-splash-screen';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import { Keyboard } from 'react-native';
import { saveKeyboardHeight } from '../../inc/keyboardStorage';
import { Platform } from 'react-native';

export default function TabLayout() {
  
  const colorScheme = useColorScheme();
SplashScreen.setOptions({ 
  duration: 1000,
  fade: true,
});

useEffect(() => {
  const eventName =
    Platform.OS === "ios"
      ? "keyboardWillShow"
      : "keyboardDidShow";

  const subscription = Keyboard.addListener(
    eventName,
    (event) => {
      saveKeyboardHeight(event.endCoordinates.height);
    }
  );

  return () => {
    subscription.remove();
  };
}, []);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2e7b88ff",
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
       <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
       <Tabs.Screen
        name="upload"
        options={{
          title: 'Anlagen',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="arrow.up.circle.fill" color={color} />,
        }}
      />
    
      
      
    </Tabs>
  );
}
