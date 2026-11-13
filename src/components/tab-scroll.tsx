import { useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, type StyleProp, type ViewStyle } from "react-native";

import { useTabBarSpace } from "@/components/tab-bar";
import { useColors } from "@/lib/theme";

/** A tab's scrolling screen: pulled down it refreshes, and its end clears the floating tab bar. */
export function TabScroll({
  onRefresh,
  contentContainerStyle,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  contentContainerStyle: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const colors = useColors();
  const tabBarSpace = useTabBarSpace();
  const [pulling, setPulling] = useState(false);

  async function pull() {
    setPulling(true);
    await onRefresh();
    setPulling(false);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[contentContainerStyle, { paddingBottom: tabBarSpace }]}
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={pull}
          tintColor={colors.primary}
          // Android draws its arrow in a bubble: white with a dark arrow in both themes, since
          // the dark theme's light `primary` vanished on the system's pale bubble.
          colors={["#14171A"]}
          progressBackgroundColor="#FFFFFF"
        />
      }
    >
      {children}
    </ScrollView>
  );
}
