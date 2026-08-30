export const DESIGN = {
  currency: "ST",
  currencyName: "Saurabh Tokens",

  colors: {
    background: "#F2F2F7",
    surface: "#FFFFFF",
    surfaceSecondary: "#F2F2F7",
    textPrimary: "#1C1C1E",
    textSecondary: "#8E8E93",
    textTertiary: "#AEAEB2",
    border: "rgba(0, 0, 0, 0.06)",
    borderLight: "rgba(0, 0, 0, 0.03)",

    brand50: "#EDEDFC",
    brand100: "#D4D4F7",
    brand200: "#B8B6F0",
    brand300: "#9B97E8",
    brand400: "#7A78FF",
    brand500: "#5E5CE6",
    brand600: "#4A48C9",
    brand700: "#3A38A8",
    brand800: "#2D2B87",
    brand900: "#1E1D5E",

    success: "#34C759",
    danger: "#FF3B30",
    warning: "#FF9500",
  },

  radius: {
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999,
  },

  spacing: {
    screenPadding: 20,
    sectionGap: 28,
    cardPadding: 20,
    cardGap: 12,
  },

  fontSize: {
    display: 32,
    screenTitle: 28,
    sectionTitle: 20,
    cardTitle: 16,
    body: 15,
    caption: 13,
    small: 11,
    balance: 36,
    balanceLarge: 44,
  },

  shadows: {
    card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
    cardHover: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
    floating: "0 4px 16px rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.04)",
    soft: "0 1px 4px rgba(0,0,0,0.04)",
    wealth: "0 4px 16px rgba(94,92,230,0.25)",
  },
} as const;

export const CATEGORIES: { value: TaskCategory; label: string; icon: string }[] = [
  { value: "study", label: "Study", icon: "📚" },
  { value: "work", label: "Work", icon: "💼" },
  { value: "health", label: "Health", icon: "🏃" },
  { value: "personal", label: "Personal", icon: "✨" },
  { value: "finance", label: "Finance", icon: "💰" },
  { value: "other", label: "Other", icon: "📋" },
];

import { TaskCategory } from "@/types";
