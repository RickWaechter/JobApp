import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './themeContext';

export const useThemedStyles = (styleFactory) => {
  const { colors, isDark } = useTheme();

  return useMemo(() => {
    const rawStyles =
      typeof styleFactory === 'function'
        ? styleFactory(colors, isDark)
        : styleFactory;

    return StyleSheet.create(rawStyles || {});
  }, [styleFactory, colors, isDark]);
};