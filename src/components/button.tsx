import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { radius, spacing, typography, useColors } from "@/lib/theme";

/** The main button: full width, dimmed when disabled, a spinner while pending. */
export function Button({
  label,
  onPress,
  disabled = false,
  pending = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.primary,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {pending ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={[typography.headline, { color: colors.onPrimary }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
});
