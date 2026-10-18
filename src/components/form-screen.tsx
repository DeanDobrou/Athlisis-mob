import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useTabBarSpace } from "@/components/tab-bar";
import { spacing, typography, useColors } from "@/lib/theme";

/**
 * Room kept under the focused field, so what follows it stays above the
 * keyboard: the button alone, or the password rules and the button.
 */
export const ROOM_FOR_BUTTON = 140;
export const ROOM_FOR_RULES = 220;

/** A signed-out screen: a large title and a line under it, then the form, centred. */
export function AuthForm({
  title,
  subtitle,
  bottomOffset,
  children,
}: {
  title: string;
  subtitle: string;
  bottomOffset: number;
  children: ReactNode;
}) {
  const colors = useColors();

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.auth}
      keyboardShouldPersistTaps="handled"
      bottomOffset={bottomOffset}
    >
      <View style={styles.heading}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      {children}
    </KeyboardAwareScrollView>
  );
}

/** A form in the account tab, its end clear of the floating tab bar. */
export function SettingsForm({
  bottomOffset,
  children,
}: {
  bottomOffset: number;
  children: ReactNode;
}) {
  const tabBarSpace = useTabBarSpace();

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.settings, { paddingBottom: tabBarSpace }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={bottomOffset}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

/** A form's error in red, or else its notice in grey. */
export function FormMessage({
  error,
  notice,
}: {
  error: string | null | undefined;
  notice?: string | null;
}) {
  const colors = useColors();
  const text = error ?? notice;
  if (!text) return null;

  return (
    <Text
      selectable
      accessibilityRole={error ? "alert" : undefined}
      style={[typography.subhead, { color: error ? colors.destructive : colors.textMuted }]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  auth: { flexGrow: 1, justifyContent: "center", gap: spacing.lg, padding: spacing.xl },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  settings: { gap: spacing.lg, padding: spacing.lg },
});
