import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors, ThemeColors } from '../theme';

const KEY_THEME = 'spliit_theme_mode';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    SecureStore.getItemAsync(KEY_THEME).then((saved) => {
      if (saved === 'dark' || saved === 'light') setModeState(saved);
    });
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    SecureStore.setItemAsync(KEY_THEME, next);
  }

  function toggleTheme() {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }

  const colors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark: mode === 'dark', toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
