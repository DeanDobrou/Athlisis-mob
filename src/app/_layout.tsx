import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useNavigationTheme } from "@/lib/theme";

export default function RootLayout() {
  return (
    <ThemeProvider value={useNavigationTheme()}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
