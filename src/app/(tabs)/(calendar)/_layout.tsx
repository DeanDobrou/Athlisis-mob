import { Stack } from "expo-router";

export default function CalendarLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: "Πρόγραμμα" }} />
    </Stack>
  );
}
