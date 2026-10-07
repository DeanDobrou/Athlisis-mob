import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme, type TextStyle } from "react-native";

/**
 * The admin panel's colours from its globals.css, converted from oklch to hex.
 * `primary` is the sidebar's near-black, `primarySoft` the soft grey behind today.
 */
const light = {
  background: "#FFFFFF",
  groupedBackground: "#F7F4F5",
  surface: "#FFFFFF",
  text: "#231F20",
  textMuted: "#6F686A",
  border: "#E6E3E4",
  primary: "#231F20",
  onPrimary: "#FFFDFD",
  primarySoft: "#E6E3E4",
  accent: "#F4F0F1",
  destructive: "#E7000B",
  destructiveFill: "#E7000B",
  destructiveSoft: "#FEE2E2",
  /** Behind today's column in the week timetable. */
  todayTint: "#ECE7E9",
  /** A class that is filling up. */
  warning: "#B45309",
};

export type Colors = typeof light;

/** Dark mode: surfaces are lighter than the background, borders are translucent. */
const dark: Colors = {
  background: "#171415",
  groupedBackground: "#171415",
  surface: "#231F20",
  text: "#FBF9FA",
  textMuted: "#A5A0A1",
  border: "#FFFFFF1A",
  primary: "#F0EEEE",
  onPrimary: "#231F20",
  // Light enough to mark the active tab and today against the dark background.
  primarySoft: "#4A4345",
  accent: "#2E2A2B",
  destructive: "#FF6467",
  destructiveFill: "#DC2626",
  destructiveSoft: "#450A0A",
  todayTint: "#2E2A2B",
  warning: "#F5A524",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Corner radii, from the admin panel's 10px base. */
export const radius = { md: 8, lg: 10, xl: 14 } as const;

/** Text sizes, drawn in the phone's system font. */
export const typography = {
  largeTitle: { fontSize: 34, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700" },
  headline: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 17 },
  subhead: { fontSize: 15 },
  footnote: { fontSize: 13 },
} as const satisfies Record<string, TextStyle>;

function useIsDark(): boolean {
  return useColorScheme() === "dark";
}

/** Stack options for screens of white cards on the grey grouped background. */
export function groupedScreenOptions(colors: Colors) {
  return {
    headerLargeTitleEnabled: true,
    contentStyle: { backgroundColor: colors.groupedBackground },
    // Android: the header matches the grouped background.
    ...(process.env.EXPO_OS === "android"
      ? {
          headerStyle: { backgroundColor: colors.groupedBackground },
          headerShadowVisible: false,
        }
      : {}),
  };
}

/** Options for a screen shown as a bottom sheet sized to its content. */
export function sheetOptions(colors: Colors) {
  return {
    presentation: "formSheet",
    headerShown: false,
    sheetAllowedDetents: "fitToContents",
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    contentStyle: { backgroundColor: colors.surface },
  } as const;
}

/** The colours for the phone's current light or dark setting. */
export function useColors(): Colors {
  return useIsDark() ? dark : light;
}

/** The navigation theme for headers and screen backgrounds, from the same colours. */
export function useNavigationTheme(): Theme {
  const isDark = useIsDark();
  const colors = isDark ? dark : light;
  const base = isDark ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.destructive,
    },
  };
}
