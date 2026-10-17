import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme, type TextStyle } from "react-native";

/**
 * Graphite: cool neutral greys with a near-black `primary`. `primarySoft` is
 * the soft grey behind the active tab and today in the month view.
 */
const light = {
  background: "#FFFFFF",
  groupedBackground: "#F1F3F5",
  surface: "#FFFFFF",
  text: "#14171A",
  textMuted: "#5A636E",
  border: "#E1E5EA",
  primary: "#14171A",
  onPrimary: "#FFFFFF",
  primarySoft: "#E3E7EC",
  accent: "#EEF1F4",
  destructive: "#E7000B",
  destructiveFill: "#E7000B",
  destructiveSoft: "#FEE2E2",
  /** Behind today's column in the week timetable. */
  todayTint: "#E6EAEF",
  /** A class that is filling up. */
  warning: "#B45309",
};

export type Colors = typeof light;

/**
 * Graphite dark: a near-black page under charcoal cards, with translucent
 * borders. Cards stay this dark so the class type colours keep 3:1 on them.
 */
const dark: Colors = {
  background: "#08090B",
  groupedBackground: "#08090B",
  surface: "#1A1E23",
  text: "#F4F6F8",
  textMuted: "#A8B1BB",
  border: "#FFFFFF29",
  primary: "#F4F6F8",
  onPrimary: "#14171A",
  // Light enough to mark the active tab and today against the dark background.
  primarySoft: "#4A545F",
  accent: "#262B31",
  destructive: "#FF6467",
  destructiveFill: "#DC2626",
  destructiveSoft: "#450A0A",
  // Kept dim: a brighter tint drops the type colours drawn on it below 3:1.
  todayTint: "#262C33",
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
