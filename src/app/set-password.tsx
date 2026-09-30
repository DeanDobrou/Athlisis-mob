import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { api, errorMessage } from "@/lib/api";
import { passwordRules } from "@/lib/password";
import { signIn, signOut, useSession } from "@/lib/session";
import { spacing, typography, useColors } from "@/lib/theme";

/** Space kept under the password field, so the rules and the button below it stay above the keyboard. */
const BOTTOM_OFFSET = 220;

export default function SetPasswordScreen() {
  const colors = useColors();
  const session = useSession();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = passwordRules(password);
  const ready = rules.every((rule) => rule.met);

  async function submit() {
    if (session.status !== "setPassword" || !ready || pending) return;
    setPending(true);
    setError(null);
    try {
      const reply = await api<{ token: string }>("/api/auth/set-password", {
        body: { newPassword: password },
        token: session.setPasswordToken,
      });
      await signIn(reply.token);
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      bottomOffset={BOTTOM_OFFSET}
    >
      <View style={styles.heading}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>
          Διάλεξε κωδικό
        </Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Ο κωδικός που σου δόθηκε ισχύει μόνο για αυτή τη σύνδεση. Διάλεξε
          τώρα τον δικό σου.
        </Text>
      </View>

      <TextField
        label="Νέος κωδικός"
        secret
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        passwordRules="minlength: 8; required: upper; required: digit; required: special;"
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <View style={styles.rules}>
        {rules.map((rule) => (
          <Text
            key={rule.label}
            accessibilityLabel={
              rule.label + (rule.met ? ", ισχύει" : ", δεν ισχύει ακόμη")
            }
            style={[
              typography.subhead,
              { color: rule.met ? colors.text : colors.textMuted },
            ]}
          >
            {rule.met ? "✓" : "○"} {rule.label}
          </Text>
        ))}
      </View>

      {error ? (
        <Text
          selectable
          accessibilityRole="alert"
          style={[typography.subhead, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : null}

      <Button
        label="Αποθήκευση"
        onPress={submit}
        disabled={!ready}
        pending={pending}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        style={styles.back}
      >
        <Text style={[typography.subhead, { color: colors.textMuted }]}>
          Πίσω στη σύνδεση
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  rules: { gap: spacing.xs },
  back: { alignSelf: "center", padding: spacing.sm },
});
