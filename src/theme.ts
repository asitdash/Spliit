export const lightColors = {
  primary: '#5C6BC0',
  primaryDark: '#3949AB',
  primaryLight: '#E8EAF6',
  accent: '#FF7043',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textMuted: '#BDBDBD',
  border: '#E0E0E0',
  success: '#43A047',
  danger: '#E53935',
  warning: '#FB8C00',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors = {
  primary: '#7C8AE0',
  primaryDark: '#5C6BC0',
  primaryLight: '#2A2F4A',
  accent: '#FF8A65',
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#F5F5F5',
  textSecondary: '#B0B0B0',
  textMuted: '#6E6E6E',
  border: '#333333',
  success: '#66BB6A',
  danger: '#EF5350',
  warning: '#FFA726',
  // Stays true white in both themes — used as a fixed foreground color
  // (icons/text) on top of colored buttons and the header, not as a
  // surface background (that's colors.surface).
  white: '#FFFFFF',
  black: '#000000',
};

export type ThemeColors = typeof lightColors;

// Kept for any leftover static imports — defaults to light palette.
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 18,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
};
