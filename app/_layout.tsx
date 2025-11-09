import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="upload" options={{ headerShown: false }}  />
                <Stack.Screen name="first" options={{ headerShown: false }}  />
                <Stack.Screen name="application" options={{ headerShown: false }}  />
                <Stack.Screen name="collect" options={{ headerShown: false }}  />
                <Stack.Screen name="name" options={{ headerShown: false }}  />
                <Stack.Screen name="old" options={{ headerShown: false }}  />
                <Stack.Screen name="nameOld" options={{ headerShown: false }}  />
                <Stack.Screen name="changeOld" options={{ headerShown: false }}  />

                <Stack.Screen name="change" options={{ headerShown: false }}  />

      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
