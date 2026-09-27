import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useColors } from "@/lib/theme";

export default function TabsLayout() {
  const colors = useColors();
  // Android only: iOS keeps the system tab bar colours.
  const android = Platform.OS === "android";

  return (
    <NativeTabs
      tintColor={colors.primary}
      indicatorColor={colors.border}
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
  );
}
