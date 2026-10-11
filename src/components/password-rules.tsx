import { StyleSheet, Text, View } from "react-native";

import { passwordRules } from "@/lib/password";
import { spacing, typography, useColors } from "@/lib/theme";

/** The password rules as a checklist, ticking each one as the typed password meets it. */
export function PasswordRules({ password }: { password: string }) {
  const colors = useColors();

  return (
    <View style={styles.rules}>
      {passwordRules(password).map((rule) => (
        <Text
          key={rule.label}
          accessibilityLabel={rule.label + (rule.met ? ", ισχύει" : ", δεν ισχύει ακόμη")}
          style={[typography.subhead, { color: rule.met ? colors.text : colors.textMuted }]}
        >
          {rule.met ? "✓" : "○"} {rule.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rules: { gap: spacing.xs },
});
