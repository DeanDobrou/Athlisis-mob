import { Stack } from "expo-router";

import { groupedScreenOptions, sheetOptions, useColors } from "@/lib/theme";

export default function CalendarLayout() {
  const colors = useColors();

  return (
    <Stack screenOptions={groupedScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ title: "Πρόγραμμα" }} />
      <Stack.Screen name="class/[id]" options={sheetOptions(colors)} />
    </Stack>
  );
}
