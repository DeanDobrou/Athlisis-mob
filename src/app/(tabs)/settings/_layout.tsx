import { Stack } from "expo-router";

import { groupedScreenOptions, sheetOptions, useColors } from "@/lib/theme";

export default function SettingsLayout() {
  const colors = useColors();

  return (
    <Stack screenOptions={groupedScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ title: "Ρυθμίσεις" }} />
      <Stack.Screen name="sign-out" options={sheetOptions(colors)} />
    </Stack>
  );
}
