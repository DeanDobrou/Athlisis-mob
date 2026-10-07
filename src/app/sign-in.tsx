import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { TextLink } from "@/components/text-link";
import { api, errorMessage } from "@/lib/api";
import { signIn, startSetPassword, useSession } from "@/lib/session";
import { spacing, typography, useColors } from "@/lib/theme";

/** Space kept under the focused field, so the button below the password stays above the keyboard. */
const BOTTOM_OFFSET = 140;

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
          selectable
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

      <TextLink
        label="Ξέχασες τον κωδικό;"
        onPress={() =>
          router.push({ pathname: "/forgot-password", params: { email: email.trim() } })
        }
      />
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
