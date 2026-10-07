import type { TabTriggerSlotProps } from "expo-router/ui";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, useColors } from "@/lib/theme";

/** The floating tab bar's size, and its gap above the bottom safe area. */
export const TAB_BAR_WIDTH = 240;
export const TAB_BAR_HEIGHT = 62;
export const TAB_BAR_PADDING = 5;
export const TAB_BAR_GAP = spacing.sm;
export const TAB_GAP = 4;

const TABS = 2;
// Inside the bar's 1px border and its padding, shared between the tabs.
const TAB_WIDTH = (TAB_BAR_WIDTH - 2 - TAB_BAR_PADDING * 2 - TAB_GAP * (TABS - 1)) / TABS;
const DURATION = 300;
/** Eases out with a slight overshoot, so the bubble settles onto its tab. */
const SETTLE = cubicBezier(0.3, 1.25, 0.5, 1);

/**
 * Bottom padding for a tab's scrolling content, so its end scrolls clear of
 * the floating tab bar. On iOS, scroll views with automatic insets already
 * clear the home indicator; Android's leave that to us.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  const safeArea = process.env.EXPO_OS === "ios" ? 0 : insets.bottom;
  return safeArea + TAB_BAR_GAP + TAB_BAR_HEIGHT + spacing.md;
}

/** The soft capsule behind the active tab, sliding over to the tab picked. */
export function TabBubble({ index }: { index: number }) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          backgroundColor: colors.primarySoft,
          transform: [{ translateX: index * (TAB_WIDTH + TAB_GAP) }],
          transitionProperty: "transform",
          transitionDuration: reduceMotion ? 0 : DURATION,
          transitionTimingFunction: SETTLE,
        },
      ]}
    />
  );
}

/** One tab in the floating bar, over the bubble when active. */
export function TabButton({
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
      style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
    >
      <SymbolView name={isFocused ? focusedIcon : icon} size={22} tintColor={ink} />
      <Animated.Text
        style={[
          styles.label,
          { color: ink, transitionProperty: "color", transitionDuration: DURATION },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    top: TAB_BAR_PADDING,
    bottom: TAB_BAR_PADDING,
    left: TAB_BAR_PADDING,
    width: TAB_WIDTH,
    borderRadius: 26,
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
