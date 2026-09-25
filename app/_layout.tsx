import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BackHandler, Keyboard, Platform } from 'react-native';
import 'react-native-reanimated';
import { saveKeyboardHeight } from '../inc/keyboardStorage';
import "../local/i18n"; // ← nur hier

// Polyfill für alte Bibliotheken (verhindert den Crash bei BackHandler.removeEventListener)
if (BackHandler && !(BackHandler as any).removeEventListener) {
  (BackHandler as any).removeEventListener = () => {};
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="upload" options={{ headerShown: false }} />
        <Stack.Screen name="first" options={{ headerShown: false }} />
        <Stack.Screen name="application" options={{ headerShown: false }} />
        <Stack.Screen name="collect" options={{ headerShown: false }} />
        <Stack.Screen name="name" options={{ headerShown: false }} />
        <Stack.Screen name="old" options={{ headerShown: false }} />
        <Stack.Screen name="nameOld" options={{ headerShown: false }} />
        <Stack.Screen name="changeOld" options={{ headerShown: false }} />
        <Stack.Screen name="uploadFirst" options={{ headerShown: false }} />
        <Stack.Screen name="email" options={{ headerShown: false }} />
        <Stack.Screen name="change" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}