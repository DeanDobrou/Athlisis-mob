import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";

import { spacing, typography, useColors } from "@/lib/theme";

const INSET = 3;
const BORDER = 1;
const DURATION = 200;
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/** A pill-shaped switch between options, the fill sliding to the selected one. */
export function Segmented({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: number;
  onChange: (index: number) => void;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const segment = Math.max(0, width - (INSET + BORDER) * 2) / options.length;

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            width: segment,
            backgroundColor: colors.primary,
            transform: [{ translateX: selected * segment }],
            transitionProperty: "transform",
            transitionDuration: reduceMotion ? 0 : DURATION,
            transitionTimingFunction: EASE_OUT,
          },
        ]}
      />
      {options.map((label, index) => {
        const on = index === selected;
        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(index)}
            hitSlop={{ top: spacing.sm, bottom: spacing.sm }}
            style={styles.segment}
          >
            <Animated.Text
              style={[
                typography.subhead,
                styles.label,
                {
                  color: on ? colors.onPrimary : colors.text,
                  transitionProperty: "color",
                  transitionDuration: DURATION,
                  transitionTimingFunction: EASE_OUT,
                },
              ]}
            >
              {label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", padding: INSET, borderWidth: BORDER, borderRadius: 999 },
  thumb: { position: "absolute", top: INSET, bottom: INSET, left: INSET, borderRadius: 999 },
  segment: { flex: 1, alignItems: "center", paddingVertical: spacing.sm },
  label: { fontWeight: "600" },
});
