export const theme = {
  colors: {
    bg: "#0B0B12",
    bgElevated: "#13131F",
    surface: "#1A1A2A",
    surfaceAlt: "#222238",
    border: "#2C2C42",
    primary: "#7C5CFC",
    primarySoft: "#2B2350",
    accent: "#28E0B0",
    text: "#F2F2FA",
    textDim: "#A0A0B8",
    textFaint: "#6C6C84",
    userBubble: "#7C5CFC",
    assistantBubble: "#1A1A2A",
    danger: "#FF6B81",
    warning: "#FFC15E",
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    pill: 999,
  },
  spacing: (n: number) => n * 4,
} as const;

export type Theme = typeof theme;
