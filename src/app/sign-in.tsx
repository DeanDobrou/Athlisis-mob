import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { api, ApiError } from "@/lib/api";
import { signIn, startSetPassword, useSession } from "@/lib/session";
import { spacing, typography, useColors } from "@/lib/theme";

export default function SignInScreen() {
  const colors = useColors();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const notice = session.status === "signedOut" ? session.notice : undefined;
  const message = error ?? notice;
  const ready = email.trim() !== "" && password !== "";

  async function submit() {
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    try {
      const reply = await api<{ token?: string; setPasswordToken?: string }>(
        "/api/auth/login",
        { body: { email, password } },
      );
      if (reply.setPasswordToken) startSetPassword(reply.setPasswordToken);
      else if (reply.token) await signIn(reply.token);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
      );
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            Athlisis
          </Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Συνδέσου με το email και τον κωδικό σου.
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Κωδικός"
          secret
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {message ? (
          <Text
            accessibilityRole="alert"
            style={[typography.subhead, { color: colors.destructive }]}
          >
            {message}
          </Text>
        ) : null}

        <Button
          label="Σύνδεση"
          onPress={submit}
          disabled={!ready}
          pending={pending}
        />

        <Text
          style={[
            typography.footnote,
            styles.help,
            { color: colors.textMuted },
          ]}
        >
          Ξέχασες τον κωδικό σου; Ζήτησε νέο από τη γραμματεία.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  help: { textAlign: "center" },
});
