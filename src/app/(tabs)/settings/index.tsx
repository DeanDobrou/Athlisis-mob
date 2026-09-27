import { ScrollView, StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography, useColors } from "@/lib/theme";

const rows = ["Προφίλ", "Αλλαγή κωδικού", "Σχετικά"];

export default function SettingsScreen() {
  const colors = useColors();
  const group = [styles.group, { backgroundColor: colors.surface }];
  const divider = [styles.divider, { backgroundColor: colors.border }];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={group}>
        {rows.map((label, i) => (
          <View key={label}>
            {i > 0 && <View style={divider} />}
            <Text style={[styles.row, typography.body, { color: colors.text }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={group}>
        <Text
          style={[styles.row, typography.body, { color: colors.destructive }]}
        >
          Αποσύνδεση
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  group: { borderRadius: radius.lg, overflow: "hidden" },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
});
