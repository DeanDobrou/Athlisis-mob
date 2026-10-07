import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { refreshIfStale } from "@/lib/schedule";
import { spacing, useColors } from "@/lib/theme";

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    // Any touch refreshes the schedule once it is three minutes old.
    <View style={{ flex: 1 }} onTouchStart={refreshIfStale}>
      {/* A style here replaces the default `flex: 1`, so it has to be repeated. */}
      <Tabs style={[styles.root, { backgroundColor: colors.groupedBackground }]}>
        <TabSlot />
        {/* A floating pill below the screens rather than over them, so it never hides a sheet or the end of a list. */}
        <TabList
          accessibilityRole="tablist"
          style={[
            styles.bar,
            {
              marginBottom: insets.bottom + spacing.sm,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TabTrigger name="calendar" href="/" asChild>
            <TabButton
              icon={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }}
              label="Πρόγραμμα"
            />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton
              icon={{ ios: "person.crop.circle", android: "account_circle", web: "account_circle" }}
              focusedIcon={{
                ios: "person.crop.circle.fill",
                android: "account_circle",
                web: "account_circle",
              }}
              label="Λογαριασμός"
            />
          </TabTrigger>
        </TabList>
      </Tabs>
    </View>
  );
}

/** One tab in the pill, the active one on a soft capsule. */
function TabButton({
  icon,
  focusedIcon = icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & {
  icon: SymbolViewProps["name"];
  focusedIcon?: SymbolViewProps["name"];
  label: string;
}) {
  const colors = useColors();
  const ink = isFocused ? colors.text : colors.textMuted;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tab,
        isFocused && { backgroundColor: colors.primarySoft },
        pressed && { opacity: 0.7 },
      ]}
    >
      <SymbolView name={isFocused ? focusedIcon : icon} size={22} tintColor={ink} />
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    alignSelf: "center",
    width: 240,
    height: 62,
    marginTop: spacing.sm,
    padding: 5,
    gap: 4,
    borderRadius: 31,
    borderWidth: 1,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
  },
  tab: {
    flex: 1,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: { fontSize: 10, fontWeight: "600" },
});
