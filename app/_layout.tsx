import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import 'react-native-reanimated';
import SQLite from 'react-native-sqlite-storage';
import { decryp } from '../inc/cryp.js';
import { runQuery } from '../inc/db.js';
import "../local/i18n"; // ← nur hier

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const load = async () => {
        const deviceId = await DeviceInfo.getUniqueId();
      const key = await EncryptedStorage.getItem('key');
 const db = await SQLite.openDatabase({
          name: 'firstNew.db',
          location: 'default',
        });
       const result = await runQuery(
  db,
  'SELECT * FROM files WHERE ident = ?',
  [deviceId]
);

const files = result.rows.raw();
  const name = await decryp(files[0].name, key);
  const street = await decryp(files[0].street, key);
  const city = await decryp(files[0].city, key);
      console.log("☀️ Geladene Daten:", { name, street, city });
      await EncryptedStorage.setItem('name', name);
      await EncryptedStorage.setItem('street', street);
      await EncryptedStorage.setItem('city', city);
      if (files[0].email && files[0].emailPassword) {
        const email =  await decryp( files[0].email, key);
        const emailPassword =  await decryp( files[0].emailPassword, key);
        const emailServer =  await decryp( files[0].emailServer, key);
        console.log("☀️ Geladene E-Mail Daten:", { email, emailPassword, emailServer });
        await EncryptedStorage.setItem('email', email);
        await EncryptedStorage.setItem('emailPassword', emailPassword);
        await EncryptedStorage.setItem('emailServer', emailServer);
      }

}
    const subscription = AppState.addEventListener("change", nextState => {
      // App wurde geöffnet / aktiv
      if (nextState === "active") {
load();
        console.log("☀️ App ist aktiv");
      }

      // App wurde in Hintergrund geschickt
      if (nextState === "background") {
        console.log("🌙 App ist im Hintergrund");
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);
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
                <Stack.Screen name="uploadFirst" options={{ headerShown: false }}  />
                <Stack.Screen name="email" options={{ headerShown: false }}  />

                <Stack.Screen name="change" options={{ headerShown: false }}  />

      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
