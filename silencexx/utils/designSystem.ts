// Color Scheme for SilenceXX
export const COLORS = {
  // Primary Colors
  primary: {
    light: '#8b5cf6',
    dark: '#6366f1',
    muted: 'rgba(139, 92, 246, 0.1)',
  },

  // Success
  success: {
    light: '#10b981',
    dark: '#059669',
    muted: 'rgba(16, 185, 129, 0.1)',
  },

  // Warning
  warning: {
    light: '#f59e0b',
    dark: '#d97706',
    muted: 'rgba(245, 158, 11, 0.1)',
  },

  // Error
  error: {
    light: '#ef4444',
    dark: '#dc2626',
    muted: 'rgba(239, 68, 68, 0.1)',
  },

  // Info
  info: {
    light: '#3b82f6',
    dark: '#2563eb',
    muted: 'rgba(59, 130, 246, 0.1)',
  },

  // Light Theme
  light: {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    border: '#e2e8f0',
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Dark Theme
  dark: {
    bg: '#0f172a',
    surface: '#1e293b',
    surfaceAlt: '#334155',
    border: 'rgba(148, 163, 184, 0.2)',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Gradients
  gradients: {
    primary: ['#8b5cf6', '#7c3aed'],
    purpleBlue: ['#8b5cf6', '#6366f1'],
    sunset: ['#ef4444', '#f59e0b'],
    ocean: ['#3b82f6', '#0ea5e9'],
    forest: ['#10b981', '#14b8a6'],
  },

  // Subscription Tier Colors
  tiers: {
    free: '#64748b',
    plus: '#8b5cf6',
    pro: '#f59e0b',
  },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Border Radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

// Typography
export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h5: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
};

// Animation Durations (in ms)
export const ANIMATION = {
  fast: 200,
  normal: 300,
  slow: 500,
};
