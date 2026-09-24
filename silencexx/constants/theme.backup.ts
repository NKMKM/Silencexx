/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     ZENITH DESIGN SYSTEM                                   ║
 * ║                     Soft Neo-Brutalism + Minimalism                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Philosophy: "Less is More" — чистые линии, монохромная палитра, 
 * один яркий акцент, много пространства, крупная типографика
 * 
 * Style: Soft Neo-Brutalism meets Modern Minimalism
 * - Monochromatic base (pure black/white with grays)
 * - Single accent color (Emerald Green)
 * - Bold geometric shapes
 * - Generous white space
 * - Subtle shadows instead of gradients
 * - Clean typography with purposeful hierarchy
 */

import { Platform, ViewStyle, TextStyle, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// CORE DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const Theme = {
  // ─────────────────────────────────────────────────────────────────────────
  // COLOR PALETTE — Monochromatic + Single Accent
  // ─────────────────────────────────────────────────────────────────────────
  
  // Background hierarchy (Dark mode - primary)
  background: {
    pure: '#000000',           // Pure black for max contrast
    primary: '#0D0D0D',        // Near black — main canvas
    secondary: '#141414',      // Slightly lighter — sections
    tertiary: '#1A1A1A',       // Gray-950 — cards
    elevated: '#212121',       // Gray-900 — elevated elements
    card: '#1C1C1C',           // Card surfaces
    muted: '#262626',          // Muted backgrounds
    overlay: 'rgba(0, 0, 0, 0.85)', // Modal overlay
    
    // Glassmorphism (subtle)
    glass: 'rgba(26, 26, 26, 0.8)',
    glassLight: 'rgba(38, 38, 38, 0.6)',
    glassSubtle: 'rgba(255, 255, 255, 0.02)',
  },
  
  // Primary Accent — Emerald (fresh, modern, trustworthy)
  accent: {
    primary: '#10B981',        // Emerald-500 — main accent
    primaryLight: '#34D399',   // Emerald-400 
    primaryDark: '#059669',    // Emerald-600
    primaryMuted: '#064E3B',   // Emerald-900 — subtle backgrounds
    primaryGlow: 'rgba(16, 185, 129, 0.25)',
    
    // Secondary accent — Cool Gray (for subtle highlights)
    secondary: '#6B7280',      // Gray-500
    secondaryLight: '#9CA3AF', // Gray-400
    
    // Gradient pairs
    gradient: ['#10B981', '#059669'] as const,
    gradientLight: ['#34D399', '#10B981'] as const,
    gradientSubtle: ['#064E3B', '#065F46'] as const,
  },
  
  // Typography colors
  text: {
    primary: '#FFFFFF',        // Pure white — main text
    secondary: '#A3A3A3',      // Neutral-400 — secondary text
    tertiary: '#737373',       // Neutral-500 — muted/hint text
    muted: '#525252',          // Neutral-600 — very muted
    accent: '#10B981',         // Emerald accent text
    inverse: '#0D0D0D',        // Text on light backgrounds
    disabled: '#404040',       // Disabled text
  },
  
  // Border colors
  border: {
    default: '#262626',        // Neutral-800 — default borders
    primary: '#262626',        // Alias for compatibility
    subtle: 'rgba(255, 255, 255, 0.06)',
    medium: '#3F3F46',         // Visible borders
    accent: 'rgba(16, 185, 129, 0.3)',
    accentStrong: 'rgba(16, 185, 129, 0.5)',
    focus: '#10B981',          // Focus states
    glass: 'rgba(255, 255, 255, 0.08)',
  },
  
  // Status colors — Semantic
  status: {
    success: '#22C55E',        // Green-500
    successBg: 'rgba(34, 197, 94, 0.12)',
    successBorder: 'rgba(34, 197, 94, 0.25)',
    
    warning: '#EAB308',        // Yellow-500
    warningBg: 'rgba(234, 179, 8, 0.12)',
    warningBorder: 'rgba(234, 179, 8, 0.25)',
    
    error: '#EF4444',          // Red-500
    errorBg: 'rgba(239, 68, 68, 0.12)',
    errorBorder: 'rgba(239, 68, 68, 0.25)',
    
    info: '#3B82F6',           // Blue-500
    infoBg: 'rgba(59, 130, 246, 0.12)',
    infoBorder: 'rgba(59, 130, 246, 0.25)',
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ELEVATION & SHADOWS
  // ─────────────────────────────────────────────────────────────────────────
  
  shadow: {
    // Soft shadows for depth
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 12,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 16,
    },
    
    // Accent glow
    glow: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    glowStrong: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 24,
      elevation: 12,
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SPACING SYSTEM — 4px base with generous scale
  // ─────────────────────────────────────────────────────────────────────────
  
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    huge: 64,
    massive: 80,
    
    // Semantic spacing
    gutter: 20,              // Page side padding
    cardPadding: 20,         // Inside cards
    sectionGap: 32,          // Between sections
    itemGap: 12,             // Between list items
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BORDER RADIUS — Geometric with purposeful roundness
  // ─────────────────────────────────────────────────────────────────────────
  
  radius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    full: 9999,
    
    // Semantic
    button: 12,
    card: 16,
    modal: 24,
    input: 12,
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY — Clean, Bold, Hierarchical
  // ─────────────────────────────────────────────────────────────────────────
  
  typography: {
    // Font families
    family: {
      regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
      medium: Platform.select({ ios: 'System', android: 'Roboto-Medium', default: 'System' }),
      semibold: Platform.select({ ios: 'System', android: 'Roboto-Medium', default: 'System' }),
      bold: Platform.select({ ios: 'System', android: 'Roboto-Bold', default: 'System' }),
      mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    
    // Type scale
    size: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
      display: 32,
      hero: 40,
    },
    
    // Line height multipliers
    lineHeight: {
      tight: 1.1,
      snug: 1.25,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    
    // Letter spacing
    tracking: {
      tighter: -0.5,
      tight: -0.25,
      normal: 0,
      wide: 0.5,
      wider: 1,
      widest: 2,
    },
    
    // Font weights (numeric for cross-platform)
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ANIMATION — Smooth, purposeful motion
  // ─────────────────────────────────────────────────────────────────────────
  
  animation: {
    // Durations
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    
    // Spring configs (for react-native-reanimated)
    spring: {
      snappy: { damping: 15, stiffness: 400 },
      gentle: { damping: 20, stiffness: 180 },
      bouncy: { damping: 10, stiffness: 150 },
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // GRADIENTS — Subtle, single-tone
  // ─────────────────────────────────────────────────────────────────────────
  
  gradients: {
    // Background gradients
    backgroundMain: ['#0D0D0D', '#141414'] as const,
    backgroundSubtle: ['#141414', '#1A1A1A'] as const,
    
    // Surface gradients  
    card: ['#1C1C1C', '#181818'] as const,
    elevated: ['#212121', '#1C1C1C'] as const,
    
    // Accent gradients
    accent: ['#10B981', '#059669'] as const,
    accentLight: ['#34D399', '#10B981'] as const,
    accentSubtle: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)'] as const,
    
    // Backwards compatibility
    mixedButton: ['#10B981', '#059669'] as const,
    accentButton: ['#10B981', '#059669'] as const,
    
    // Glass overlay
    glassOverlay: ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0)'] as const,
    
    // Text/mask gradients
    shimmer: ['transparent', 'rgba(255, 255, 255, 0.1)', 'transparent'] as const,
  },
  
  // Screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  
  // Legacy compatibility aliases
  glow: {
    purple: 'rgba(16, 185, 129, 0.4)',
    purpleStrong: 'rgba(16, 185, 129, 0.65)',
    pink: 'rgba(16, 185, 129, 0.4)',
    pinkStrong: 'rgba(16, 185, 129, 0.65)',
    cyan: 'rgba(16, 185, 129, 0.4)',
    ambient: 'rgba(16, 185, 129, 0.2)',
  },
  
  // Legacy glass alias
  glass: {
    background: 'rgba(26, 26, 26, 0.8)',
    backgroundLight: 'rgba(38, 38, 38, 0.6)',
    border: 'rgba(255, 255, 255, 0.08)',
    blur: 20,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════

export const Colors = {
  light: {
    text: Theme.text.primary,
    background: Theme.background.primary,
    tint: Theme.accent.primary,
    icon: Theme.text.secondary,
    tabIconDefault: Theme.text.tertiary,
    tabIconSelected: Theme.accent.primary,
  },
  dark: {
    text: Theme.text.primary,
    background: Theme.background.primary,
    tint: Theme.accent.primary,
    icon: Theme.text.secondary,
    tabIconDefault: Theme.text.tertiary,
    tabIconSelected: Theme.accent.primary,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT STYLES — Pre-built ZENITH patterns
// ═══════════════════════════════════════════════════════════════════════════

export const CommonStyles = {
  // ─────────────────────────────────────────────────────────────────────────
  // CARDS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Standard card
  card: {
    backgroundColor: Theme.background.card,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.default,
  } as ViewStyle,
  
  // Elevated card with shadow
  cardElevated: {
    backgroundColor: Theme.background.elevated,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.default,
    ...Theme.shadow.md,
  } as ViewStyle,
  
  // Glass card (subtle transparency)
  glassCard: {
    backgroundColor: Theme.background.glass,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.glass,
  } as ViewStyle,
  
  // Elevated card (legacy alias)
  elevatedCard: {
    backgroundColor: Theme.background.elevated,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.border.default,
    ...Theme.shadow.lg,
  } as ViewStyle,

  // Floating card (elevated)
  floatingCard: {
    backgroundColor: Theme.background.elevated,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.border.medium,
    ...Theme.shadow.xl,
  } as ViewStyle,
  
  // Interactive card (touch feedback ready)
  cardInteractive: {
    backgroundColor: Theme.background.card,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.default,
    ...Theme.shadow.sm,
  } as ViewStyle,
  
  // Accent border card
  cardAccent: {
    backgroundColor: Theme.background.card,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.accent,
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // BUTTONS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Primary button (solid accent)
  buttonPrimary: {
    backgroundColor: Theme.accent.primary,
    borderRadius: Theme.radius.button,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  // Secondary button (outlined)
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: Theme.radius.button,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    borderWidth: 1.5,
    borderColor: Theme.border.medium,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  // Accent button glow (legacy)
  accentButton: {
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  // Pink button glow (legacy alias)
  pinkButton: {
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  // Ghost button (text only, no border)
  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: Theme.radius.button,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  // Icon button (circular)
  buttonIcon: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.background.elevated,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Theme.border.default,
  } as ViewStyle,
  
  // Icon button primary (accent)
  buttonIconPrimary: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.accent.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // INPUTS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Standard input
  input: {
    backgroundColor: Theme.background.tertiary,
    borderRadius: Theme.radius.input,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.border.default,
    color: Theme.text.primary,
    fontSize: Theme.typography.size.base,
  } as ViewStyle & TextStyle,
  
  // Input field (legacy alias)
  inputField: {
    backgroundColor: Theme.background.tertiary,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.border.default,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    color: Theme.text.primary,
  } as ViewStyle,
  
  // Soft inset style (legacy)
  insetCard: {
    backgroundColor: Theme.background.secondary,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.border.subtle,
    padding: Theme.spacing.lg,
  } as ViewStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY STYLES
  // ─────────────────────────────────────────────────────────────────────────
  
  // Headings
  displayLarge: {
    fontSize: Theme.typography.size.hero,
    fontWeight: Theme.typography.weight.extrabold,
    color: Theme.text.primary,
    letterSpacing: Theme.typography.tracking.tight,
    lineHeight: Theme.typography.size.hero * Theme.typography.lineHeight.tight,
  } as TextStyle,
  
  displayMedium: {
    fontSize: Theme.typography.size.display,
    fontWeight: Theme.typography.weight.bold,
    color: Theme.text.primary,
    letterSpacing: Theme.typography.tracking.tight,
    lineHeight: Theme.typography.size.display * Theme.typography.lineHeight.tight,
  } as TextStyle,
  
  heading: {
    fontSize: Theme.typography.size.xxl,
    fontWeight: Theme.typography.weight.bold,
    color: Theme.text.primary,
    letterSpacing: Theme.typography.tracking.tight,
    lineHeight: Theme.typography.size.xxl * Theme.typography.lineHeight.snug,
  } as TextStyle,
  
  subheading: {
    fontSize: Theme.typography.size.lg,
    fontWeight: Theme.typography.weight.semibold,
    color: Theme.text.secondary,
    letterSpacing: Theme.typography.tracking.normal,
    lineHeight: Theme.typography.size.lg * Theme.typography.lineHeight.snug,
  } as TextStyle,
  
  // Body text
  body: {
    fontSize: Theme.typography.size.base,
    fontWeight: Theme.typography.weight.regular,
    color: Theme.text.primary,
    lineHeight: Theme.typography.size.base * Theme.typography.lineHeight.normal,
  } as TextStyle,
  
  bodySmall: {
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.regular,
    color: Theme.text.secondary,
    lineHeight: Theme.typography.size.sm * Theme.typography.lineHeight.normal,
  } as TextStyle,
  
  // Label / Caption
  label: {
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.medium,
    color: Theme.text.secondary,
    letterSpacing: Theme.typography.tracking.wide,
    textTransform: 'uppercase' as const,
  } as TextStyle,
  
  caption: {
    fontSize: Theme.typography.size.xs,
    fontWeight: Theme.typography.weight.regular,
    color: Theme.text.tertiary,
  } as TextStyle,
  
  // Badge styles
  badge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.accent.primary,
  } as ViewStyle,
  
  badgeText: {
    color: Theme.text.inverse,
    fontSize: 11,
    fontWeight: Theme.typography.weight.bold,
    letterSpacing: 0.5,
  } as TextStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  
  // Page container
  pageContainer: {
    flex: 1,
    backgroundColor: Theme.background.primary,
  } as ViewStyle,
  
  // Content wrapper with padding
  contentWrapper: {
    flex: 1,
    paddingHorizontal: Theme.spacing.gutter,
  } as ViewStyle,
  
  // Centered content
  centered: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  // Row layout
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  } as ViewStyle,
  
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  } as ViewStyle,
  
  // Section divider
  divider: {
    height: 1,
    backgroundColor: Theme.border.default,
    marginVertical: Theme.spacing.lg,
  } as ViewStyle,
};

// ═══════════════════════════════════════════════════════════════════════════
// FONTS
// ═══════════════════════════════════════════════════════════════════════════

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export default Theme;
