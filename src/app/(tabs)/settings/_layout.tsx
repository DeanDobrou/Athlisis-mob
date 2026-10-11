import { Stack } from "expo-router";

import { groupedScreenOptions, sheetOptions, useColors } from "@/lib/theme";

export default function SettingsLayout() {
  const colors = useColors();

  return (
    <Stack screenOptions={groupedScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ title: "Λογαριασμός" }} />
      <Stack.Screen name="profile" options={{ title: "Προφίλ", headerLargeTitleEnabled: false }} />
      <Stack.Screen
        name="password"
        options={{ title: "Αλλαγή κωδικού", headerLargeTitleEnabled: false }}
      />
      <Stack.Screen name="email" options={{ title: "Αλλαγή email", headerLargeTitleEnabled: false }} />
      <Stack.Screen name="sign-out" options={sheetOptions(colors)} />
    </Stack>
  );
}
