import { Pressable, StyleSheet, Text } from "react-native";

import { spacing, typography, useColors } from "@/lib/theme";

/** A tappable line of text, for the secondary actions under a form. */
export function TextLink({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={spacing.sm}
      style={({ pressed }) => [styles.link, { opacity: pressed || disabled ? 0.5 : 1 }]}
    >
      <Text style={[typography.subhead, styles.label, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: "center", padding: spacing.sm },
  label: { fontWeight: "600" },
});
