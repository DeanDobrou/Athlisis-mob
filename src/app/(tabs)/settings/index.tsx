import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { signOut } from "@/lib/session";
import { radius, spacing, typography, useColors } from "@/lib/theme";

const rows = ["Προφίλ", "Αλλαγή κωδικού", "Σχετικά"];

function confirmSignOut() {
  Alert.alert("Αποσύνδεση", "Θέλεις σίγουρα να αποσυνδεθείς;", [
    { text: "Άκυρο", style: "cancel" },
    { text: "Αποσύνδεση", style: "destructive", onPress: () => void signOut() },
  ]);
}

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
        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          style={({ pressed }) => pressed && { backgroundColor: colors.accent }}
        >
          <Text
            style={[styles.row, typography.body, { color: colors.destructive }]}
          >
            Αποσύνδεση
          </Text>
        </Pressable>
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
