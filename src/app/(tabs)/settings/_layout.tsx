import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useColors } from "@/lib/theme";

export default function SettingsLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        contentStyle: { backgroundColor: colors.groupedBackground },
        // Android: the header matches the grouped background.
        ...(Platform.OS === "android"
          ? {
              headerStyle: { backgroundColor: colors.groupedBackground },
              headerShadowVisible: false,
            }
          : {}),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ρυθμίσεις" }} />
    </Stack>
  );
}
