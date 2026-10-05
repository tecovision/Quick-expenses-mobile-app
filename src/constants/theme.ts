export const colors = {
  bgApp: '#F9F9F9',
  bgCard: '#FFFFFF',
  bgSurface: '#F2F2F7',
  textPrimary: '#1C1C1E',
  textMuted: '#787776',
  textLabel: '#9E9E9E',
  danger: '#C0392B',
  border: 'rgba(60,60,67,0.15)',
  borderLight: 'rgba(60,60,67,0.10)',
  accent: '#007AFF',
  accentSoft: '#EAF3FF',
  dangerSoft: '#FFF1F0',
  white: '#FFFFFF',
} as const;

// Reusable elevation presets — a soft, consistent "lift" for primary buttons
// and tappable cards instead of ad-hoc shadow values scattered per screen.
// `elevation` makes these show up on Android; the shadow* fields are for iOS.
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
