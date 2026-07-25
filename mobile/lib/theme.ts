// Design tokens — final Serial Vault design handoff.
// One UI, three user-selectable themes (lime / periwinkle / mono); everything
// neutral is shared, only the accent token set changes. A screen never mixes
// two accents.

export type ThemeName = "lime" | "periwinkle" | "mono";

export interface AccentTokens {
  /** Pale accent surface: primary option card, splash pages. */
  accentSurface: string;
  /** Hairline for accentSurface (mono's white card needs one; else transparent). */
  accentSurfaceBorder: string;
  /** Strong accent: CTAs, chips, progress fill — always on light ground. */
  accentStrong: string;
  /** Text/icons on accentStrong. */
  onAccent: string;
  /** Small indicator marks on light ground (avatar notification dot). */
  accentIndicator: string;
  /** Accent role rendered ON an ink surface (chips, nav active pill, text). */
  accentOnInk: string;
  /** Text/icons on accentOnInk. */
  onAccentOnInk: string;
  /** Check glyphs drawn on ink circles (claim proof rows). */
  indicatorOnInk: string;
  /** Splash onboarding */
  splashBg: string;
  splashInk: string;
  splashBody: string;
  splashDotInactive: string;
  splashBtnBg: string;
  splashBtnText: string;
  /** Camera viewfinder ground stripes + accent (brackets, scan line, chips). */
  cameraGroundA: string;
  cameraGroundB: string;
  cameraAccent: string;
  onCameraAccent: string;
}

export const THEMES: Record<ThemeName, AccentTokens> = {
  lime: {
    accentSurface: "#F3FEDD",
    accentSurfaceBorder: "transparent",
    accentStrong: "#F3FEDD",
    onAccent: "#0B0B0B",
    accentIndicator: "#D9F58F",
    accentOnInk: "#F3FEDD",
    onAccentOnInk: "#0B0B0B",
    indicatorOnInk: "#D9F58F",
    splashBg: "#F3FEDD",
    splashInk: "#17171C",
    splashBody: "rgba(23,23,28,0.8)",
    splashDotInactive: "rgba(23,23,28,0.22)",
    splashBtnBg: "#17171C",
    splashBtnText: "#FFFFFF",
    cameraGroundA: "#17150F",
    cameraGroundB: "#1E1B14",
    cameraAccent: "#F3FEDD",
    onCameraAccent: "#0B0B0B",
  },
  periwinkle: {
    accentSurface: "#C5D3FD",
    accentSurfaceBorder: "transparent",
    accentStrong: "#C5D3FD",
    onAccent: "#0B0B0B",
    accentIndicator: "#C5D3FD",
    accentOnInk: "#C5D3FD",
    onAccentOnInk: "#0B0B0B",
    indicatorOnInk: "#C5D3FD",
    splashBg: "#C5D3FD",
    splashInk: "#17171C",
    splashBody: "rgba(23,23,28,0.8)",
    splashDotInactive: "rgba(23,23,28,0.2)",
    splashBtnBg: "#17171C",
    splashBtnText: "#FFFFFF",
    cameraGroundA: "#0F1117",
    cameraGroundB: "#161A24",
    cameraAccent: "#C5D3FD",
    onCameraAccent: "#0B0B0B",
  },
  mono: {
    accentSurface: "#FFFFFF",
    accentSurfaceBorder: "#E4E1DA",
    accentStrong: "#0B0B0B",
    onAccent: "#FFFFFF",
    accentIndicator: "#0B0B0B",
    accentOnInk: "#FFFFFF",
    onAccentOnInk: "#0B0B0B",
    indicatorOnInk: "#FFFFFF",
    splashBg: "#FFFFFF",
    splashInk: "#0B0B0B",
    splashBody: "#5F5B54",
    splashDotInactive: "rgba(11,11,11,0.2)",
    splashBtnBg: "#0B0B0B",
    splashBtnText: "#FFFFFF",
    cameraGroundA: "#17150F",
    cameraGroundB: "#1E1B14",
    cameraAccent: "#FFFFFF",
    onCameraAccent: "#0B0B0B",
  },
};

// Shared neutrals (identical across themes)
export const ink = {
  ink: "#0B0B0B",
  paper: "#FFFFFF",
  card: "#F7F6F4",
  cardBorder: "#EEECE8",
  hairline: "#ECEAE5",
  controlBorder: "#E4E1DA",
  chipBorder: "#DEDBD4",
  avatarBg: "#F4F3F0",
  textSecondary: "#8A857D",
  textMuted: "#9A958E",
  chipOutlineText: "#6E695F",
  onInkSecondary: "rgba(255,255,255,0.6)",
  onInkBorder: "rgba(255,255,255,0.28)",
  onInkDivider: "rgba(255,255,255,0.12)",
  viewfinder: "#17150F",
  overlayPill: "rgba(255,255,255,0.12)",
  placeholder: "#F1EFEB",
  placeholderAlt: "#E9E6E0",
  placeholderText: "#7A756C",
  progressTrack: "#F0EEE9",
  pressHighlight: "#F1EFEB",
};

export const fonts = {
  // Hanken Grotesk
  regular: "HankenGrotesk_400Regular",
  medium: "HankenGrotesk_500Medium",
  semibold: "HankenGrotesk_600SemiBold",
  bold: "HankenGrotesk_700Bold",
  extrabold: "HankenGrotesk_800ExtraBold",
  // JetBrains Mono
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
  monoSemibold: "JetBrainsMono_600SemiBold",
};

export const SCREEN_PAD = 22;

export const THEME_LABELS: Record<ThemeName, string> = {
  lime: "Lime",
  periwinkle: "Periwinkle",
  mono: "Mono",
};

/** Profile swatch fills (each drawn with a 1px rgba(11,11,11,.12) hairline). */
export const THEME_SWATCHES: Record<Exclude<ThemeName, "mono">, string> = {
  lime: "#F3FEDD",
  periwinkle: "#C5D3FD",
};
