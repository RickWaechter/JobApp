import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { BackHandler } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../comp/themeContext';
import '../local/i18n'; // ← nur hier

// Polyfill für alte Bibliotheken (verhindert den Crash bei BackHandler.removeEventListener)
if (BackHandler && !(BackHandler as any).removeEventListener) {
  (BackHandler as any).removeEventListener = () => {};
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { colors, isDark } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
      },
    };
  }, [colors, isDark]);

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          // Verhindert weißes Aufblitzen beim Screen-Wechsel
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="cover" options={{ headerShown: false, title: 'cover' }} />
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
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}