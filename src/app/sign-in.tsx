import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useColors } from "@/lib/theme";

export default function SignInScreen() {
  const colors = useColors();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[typography.largeTitle, { color: colors.text }]}>
        Athlisis
      </Text>
      <Text style={[typography.body, { color: colors.textMuted }]}>
        Η φόρμα σύνδεσης έρχεται στο επόμενο βήμα.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
});
