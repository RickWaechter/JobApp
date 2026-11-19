// context/ThemeContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StatusBar, useColorScheme } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage'; // oder AsyncStorage
import { darkColors, lightColors } from '../inc/themeColor';

const THEME_STORAGE_KEY = 'app_theme_mode'; // 'system' | 'light' | 'dark'

const ThemeContext = createContext({
  colors: darkColors,
  isDark: true,
  mode: 'system',
  setMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState('system');

  // Gespeicherte Präferenz beim App-Start laden
  useEffect(() => {
    EncryptedStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  // Theme wechseln & speichern
  const setMode = (nextMode) => {
    setModeState(nextMode);
    EncryptedStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {});
  };

  // Effektives Theme bestimmen
  const isDark =
    mode === 'system' ? systemScheme !== 'light' : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  // Native System-Komponenten (Tastatur, Alerts) synchronisieren
  useEffect(() => {
    if (Appearance.setColorScheme) {
      Appearance.setColorScheme(mode === 'system' ? null : mode);
    }
  }, [mode]);

  const value = useMemo(
    () => ({
      colors,
      isDark,
      mode,
      setMode,
    }),
    [colors, isDark, mode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);