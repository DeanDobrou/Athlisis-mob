import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography, useColors } from "@/lib/theme";

/** Rows grouped on one card, under an optional small heading. */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const colors = useColors();
  const group = <View style={[styles.group, { backgroundColor: colors.surface }]}>{children}</View>;
  if (!title) return group;

  return (
    <View style={styles.section}>
      <Text style={[typography.footnote, styles.header, { color: colors.textMuted }]}>{title}</Text>
      {group}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { paddingHorizontal: spacing.lg },
  group: { borderRadius: radius.lg, borderCurve: "continuous", overflow: "hidden" },
});
