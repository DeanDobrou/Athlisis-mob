import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { spacing, typography, useColors } from "@/lib/theme";

/** A sheet asking to confirm a destructive step: icon, title, message and two choices. */
export function ConfirmSheet({
  icon,
  title,
  message,
  detail,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending = false,
  error,
}: {
  icon: ComponentProps<typeof SymbolView>["name"];
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string | null;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={[styles.icon, { backgroundColor: colors.destructiveSoft }]}>
        <SymbolView name={icon} size={26} tintColor={colors.destructive} />
      </View>
      <Text style={[typography.title, styles.center, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.body, styles.center, { color: colors.textMuted }]}>
        {message}
      </Text>
      {detail && (
        <Text style={[typography.headline, styles.center, { color: colors.text }]}>
          {detail}
        </Text>
      )}
      {error && (
        <Text
          selectable
          accessibilityRole="alert"
          style={[typography.body, styles.center, { color: colors.destructive }]}
        >
          {error}
        </Text>
      )}
      <View style={styles.actions}>
        <Button label={confirmLabel} tone="danger" onPress={onConfirm} pending={pending} />
        <Button label={cancelLabel} tone="plain" onPress={onCancel} disabled={pending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: spacing.xl, gap: spacing.md, alignItems: "center" },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  center: { textAlign: "center" },
  actions: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.sm },
});
