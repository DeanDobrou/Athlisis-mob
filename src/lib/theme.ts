import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme, type TextStyle } from "react-native";

/** The admin panel's colours from its globals.css, converted from oklch to hex. */
const light = {
  background: "#FFFFFF",
  groupedBackground: "#F7F4F5",
  surface: "#FFFFFF",
  surfaceMuted: "#F7F4F5",
  text: "#231F20",
  textMuted: "#6F686A",
  border: "#E6E3E4",
  primary: "#231F20",
  onPrimary: "#FFFDFD",
  accent: "#F4F0F1",
  destructive: "#E7000B",
};

export type Colors = typeof light;

/** Dark mode: surfaces are lighter than the background, borders are translucent. */
const dark: Colors = {
  background: "#171415",
  groupedBackground: "#171415",
  surface: "#231F20",
  surfaceMuted: "#2E2A2B",
  text: "#FBF9FA",
  textMuted: "#A5A0A1",
  border: "#FFFFFF1A",
  primary: "#F0EEEE",
  onPrimary: "#231F20",
  accent: "#2E2A2B",
  destructive: "#FF6467",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Corner radii, from the admin panel's 10px base. */
export const radius = { sm: 6, md: 8, lg: 10, xl: 14 } as const;

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

/** Black or white, whichever contrasts more with a #RRGGBB background. */
export function readableOn(hex: string): string {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.179 ? "#171415" : "#FFFFFF";
}
