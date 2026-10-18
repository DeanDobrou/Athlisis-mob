import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { Button } from "@/components/button";
import { AuthForm, FormMessage, ROOM_FOR_RULES } from "@/components/form-screen";
import { PasswordRules } from "@/components/password-rules";
import { TextField } from "@/components/text-field";
import { useAction } from "@/lib/action";
import { api } from "@/lib/api";
import type { TokenReply } from "@/lib/contract";
import { passwordRules } from "@/lib/password";
import { signInWith, signOut, useSession } from "@/lib/session";
import { spacing, typography, useColors } from "@/lib/theme";

export default function SetPasswordScreen() {
  const colors = useColors();
  const session = useSession();
  const [password, setPassword] = useState("");
  const { pending, error, run } = useAction();

  const ready = passwordRules(password).every((rule) => rule.met);

  function submit() {
    if (session.status !== "setPassword" || !ready) return;
    const token = session.setPasswordToken;
    // Backed out meanwhile: this attempt is over, so its reply signs no one in.
    void run(async () => {
      await signInWith(() =>
        api<TokenReply>("/api/auth/set-password", { body: { newPassword: password }, token }),
      );
    });
  }

  return (
    <AuthForm
      title="Διάλεξε κωδικό"
      subtitle="Ο κωδικός που σου δόθηκε ισχύει μόνο για αυτή τη σύνδεση. Διάλεξε τώρα τον δικό σου."
      bottomOffset={ROOM_FOR_RULES}
    >
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

      <PasswordRules password={password} />

      <FormMessage error={error} />

      <Button label="Αποθήκευση" onPress={submit} disabled={!ready} pending={pending} />

      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.back}>
        <Text style={[typography.subhead, { color: colors.textMuted }]}>Πίσω στη σύνδεση</Text>
      </Pressable>
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "center", padding: spacing.sm },
});
