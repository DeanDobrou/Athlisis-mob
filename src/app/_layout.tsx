import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { loadSession, useSession } from "@/lib/session";
import { useNavigationTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const session = useSession();
  const theme = useNavigationTheme();

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (session.status !== "loading") SplashScreen.hide();
  }, [session.status]);

  if (session.status === "loading") return null;

  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={session.status === "signedIn"}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={session.status === "signedOut"}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={session.status === "setPassword"}>
          <Stack.Screen name="set-password" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
