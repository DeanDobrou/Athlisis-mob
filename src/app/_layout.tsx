import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { loadSession, useSession } from "@/lib/session";
import { useColors, useNavigationTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const session = useSession();
  const theme = useNavigationTheme();
  const colors = useColors();

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.groupedBackground);
  }, [colors.groupedBackground]);

  useEffect(() => {
    if (session.status !== "loading") SplashScreen.hide();
  }, [session.status]);

  if (session.status === "loading") return null;

  return (
    <KeyboardProvider>
      <ThemeProvider value={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={session.status === "signedIn"}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={session.status === "signedOut"}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="forgot-password" />
          </Stack.Protected>
          <Stack.Protected guard={session.status === "setPassword"}>
            <Stack.Screen name="set-password" />
          </Stack.Protected>
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </KeyboardProvider>
  );
}
