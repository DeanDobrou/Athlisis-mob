import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { radius, spacing, typography, useColors } from "@/lib/theme";

/**
 * A full-width button, dimmed when disabled, with a spinner while pending.
 * `danger` is outlined in red; `plain` is text only.
 */
export function Button({
  label,
  onPress,
  disabled = false,
  pending = false,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  tone?: "primary" | "danger" | "plain";
}) {
  const colors = useColors();
  const ink =
    tone === "primary"
      ? colors.onPrimary
      : tone === "danger"
        ? colors.destructive
        : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: tone === "primary" ? colors.primary : "transparent",
          borderColor: tone === "danger" ? colors.destructive : "transparent",
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {pending ? (
        <ActivityIndicator color={ink} />
      ) : (
        <Text style={[typography.headline, { color: ink }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
});
