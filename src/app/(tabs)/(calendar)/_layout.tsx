import { Stack } from "expo-router";

import { useColors } from "@/lib/theme";

export default function CalendarLayout() {
  const colors = useColors();

  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: "Πρόγραμμα" }} />
      <Stack.Screen
        name="class/[id]"
        options={{
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: "fitToContents",
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
