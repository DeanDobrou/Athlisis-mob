import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, View, type TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Button } from "@/components/button";
import { PasswordRules } from "@/components/password-rules";
import { TextField } from "@/components/text-field";
import { TextLink } from "@/components/text-link";
import { api, errorMessage } from "@/lib/api";
import { passwordRules } from "@/lib/password";
import { getSession, signIn } from "@/lib/session";
import { spacing, typography, useColors } from "@/lib/theme";

/** Space kept under the focused field, so the rules and the button below it stay above the keyboard. */
const BOTTOM_OFFSET = 220;

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState(params.email ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSend = email.trim() !== "";
  const canSave = code.trim().length === 6 && passwordRules(password).every((r) => r.met);

  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  function send(again: boolean) {
    if (!canSend) return;
    void run(async () => {
      await api("/api/auth/forgot-password", { body: { email } });
      setSentTo(email.trim().toLowerCase());
      if (again) setNotice("Σου στείλαμε νέο κωδικό. Ο προηγούμενος δεν ισχύει πια.");
    });
  }

  function save() {
    if (!canSave || !sentTo) return;
    // Signing in swaps this screen for the app, so nothing follows it here.
    void run(async () => {
      const from = getSession();
      const { token } = await api<{ token: string }>("/api/auth/reset-password", {
        body: { email: sentTo, code, password },
      });
      // Someone signed in another way meanwhile: this reply must not replace them.
      if (getSession() !== from) return;
      await signIn(token);
    });
  }

  const message = (error || notice) && (
    <Text
      selectable
      accessibilityRole={error ? "alert" : undefined}
      style={[typography.subhead, { color: error ? colors.destructive : colors.textMuted }]}
    >
      {error ?? notice}
    </Text>
  );

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      bottomOffset={BOTTOM_OFFSET}
    >
      {sentTo === null ? (
        <>
          <View style={styles.heading}>
            <Text style={[typography.largeTitle, { color: colors.text }]}>
              Ξέχασες τον κωδικό;
            </Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Γράψε το email του λογαριασμού σου και θα σου στείλουμε κωδικό για να ορίσεις
              νέο.
            </Text>
          </View>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="send"
            onSubmitEditing={() => send(false)}
          />
          {message}
          <Button
            label="Αποστολή κωδικού"
            onPress={() => send(false)}
            disabled={!canSend}
            pending={pending}
          />
        </>
      ) : (
        <>
          <View style={styles.heading}>
            <Text style={[typography.largeTitle, { color: colors.text }]}>
              Έλεγξε το email σου
            </Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Αν το {sentTo} ανήκει σε λογαριασμό, θα λάβεις εκεί κωδικό 6 ψηφίων. Ισχύει για 15
              λεπτά.
            </Text>
          </View>

          <TextField
            label="Κωδικός από το email"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={passwordRef}
            label="Νέος κωδικός πρόσβασης"
            secret
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            passwordRules="minlength: 8; required: upper; required: digit; required: special;"
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <PasswordRules password={password} />
          {message}
          <Button label="Αποθήκευση" onPress={save} disabled={!canSave} pending={pending} />
          <TextLink label="Στείλε νέο κωδικό" onPress={() => send(true)} disabled={pending} />
        </>
      )}

      <TextLink label="Πίσω στη σύνδεση" onPress={() => router.back()} />
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
});
