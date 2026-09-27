import { ScrollView, StyleSheet, Text } from "react-native";

import { spacing, typography, useColors } from "@/lib/theme";

export default function CalendarScreen() {
  const colors = useColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={[typography.body, { color: colors.textMuted }]}>
        Εδώ θα εμφανίζεται το πρόγραμμα, σε προβολή εβδομάδας και μήνα.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
});
