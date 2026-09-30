import { NativeTabs } from "expo-router/unstable-native-tabs";
import { View } from "react-native";

import { refreshIfStale } from "@/lib/schedule";
import { useColors } from "@/lib/theme";

export default function TabsLayout() {
  const colors = useColors();
  // Android only: iOS keeps the system tab bar colours.
  const android = process.env.EXPO_OS === "android";

  return (
    // Any touch refreshes the schedule once it is three minutes old.
    <View style={{ flex: 1 }} onTouchStart={refreshIfStale}>
      <NativeTabs
        tintColor={colors.primary}
        indicatorColor={colors.primarySoft}
        backgroundColor={android ? colors.background : undefined}
        iconColor={
          android
            ? { default: colors.textMuted, selected: colors.primary }
            : undefined
        }
        labelStyle={
          android
            ? {
                default: { color: colors.textMuted },
                selected: { color: colors.primary },
              }
            : undefined
        }
      >
        <NativeTabs.Trigger name="(calendar)">
          <NativeTabs.Trigger.Label>Πρόγραμμα</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>Ρυθμίσεις</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "gearshape", selected: "gearshape.fill" }}
            md="settings"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
