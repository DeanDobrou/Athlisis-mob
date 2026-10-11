import { usePathname } from "expo-router";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  TAB_BAR_GAP,
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING,
  TAB_BAR_WIDTH,
  TAB_GAP,
  TabBubble,
  TabButton,
} from "@/components/tab-bar";
import { refreshIfStale } from "@/lib/schedule";
import { useColors } from "@/lib/theme";

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // On Android a sheet opens inside the tab, under the bar, so the bar steps aside for it.
  const sheetOpen = pathname.startsWith("/class/") || pathname === "/settings/sign-out";

  return (
    // Any touch refreshes the schedule once it is three minutes old.
    <View style={{ flex: 1 }} onTouchStart={refreshIfStale}>
      {/* A style here replaces the default `flex: 1`, so it has to be repeated. */}
      <Tabs style={[styles.root, { backgroundColor: colors.groupedBackground }]}>
        <TabSlot />
        {/* Floats over the screens; each scrolling screen leaves room with useTabBarSpace(). */}
        <TabList asChild>
          <Animated.View
            accessibilityRole="tablist"
            aria-hidden={sheetOpen}
            // One style object: a child of `asChild` may not take a style array.
            style={{
              ...styles.bar,
              bottom: insets.bottom + TAB_BAR_GAP,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: sheetOpen ? 0 : 1,
              pointerEvents: sheetOpen ? "none" : "auto",
              transitionProperty: "opacity",
              transitionDuration: 200,
            }}
          >
            <TabBubble index={pathname.startsWith("/settings") ? 1 : 0} />
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
          </Animated.View>
        </TabList>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    padding: TAB_BAR_PADDING,
    gap: TAB_GAP,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
  },
});
