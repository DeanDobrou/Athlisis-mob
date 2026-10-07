import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, type TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Button } from "@/components/button";
import { PasswordRules } from "@/components/password-rules";
import { useTabBarSpace } from "@/components/tab-bar";
import { TextField } from "@/components/text-field";
import { api, errorMessage } from "@/lib/api";
import { passwordRules } from "@/lib/password";
import { signIn } from "@/lib/session";
import { spacing, typography, useColors } from "@/lib/theme";

/** Space kept under the focused field, so the rules and the button below it stay above the keyboard. */
const BOTTOM_OFFSET = 220;

export default function ChangePasswordScreen() {
  const colors = useColors();
  const tabBarSpace = useTabBarSpace();
  const newRef = useRef<TextInput>(null);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = current !== "" && passwordRules(password).every((rule) => rule.met);

  async function submit() {
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    try {
      const reply = await api<{ token: string }>("/api/user-profile/password", {
        body: { currentPassword: current, newPassword: password },
      });
      await signIn(reply.token);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={BOTTOM_OFFSET}
    >
      <TextField
        label="Τρέχων κωδικός"
        secret
        value={current}
        onChangeText={setCurrent}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => newRef.current?.focus()}
      />
      <TextField
        ref={newRef}
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

      {error ? (
        <Text
          selectable
          accessibilityRole="alert"
          style={[typography.subhead, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : null}

      <Button label="Αποθήκευση" onPress={submit} disabled={!ready} pending={pending} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
});
