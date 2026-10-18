import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";

import { Button } from "@/components/button";
import { AuthForm, FormMessage, ROOM_FOR_RULES } from "@/components/form-screen";
import { PasswordRules } from "@/components/password-rules";
import { TextField } from "@/components/text-field";
import { TextLink } from "@/components/text-link";
import { useAction } from "@/lib/action";
import { api } from "@/lib/api";
import type { TokenReply } from "@/lib/contract";
import { passwordRules } from "@/lib/password";
import { signInWith } from "@/lib/session";

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState(params.email ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, notice, setNotice, run } = useAction();

  const canSend = email.trim() !== "";
  const canSave = code.trim().length === 6 && passwordRules(password).every((r) => r.met);

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
      await signInWith(() =>
        api<TokenReply>("/api/auth/reset-password", { body: { email: sentTo, code, password } }),
      );
    });
  }

  return (
    <AuthForm
      title={sentTo === null ? "Ξέχασες τον κωδικό;" : "Έλεγξε το email σου"}
      subtitle={
        sentTo === null
          ? "Γράψε το email του λογαριασμού σου και θα σου στείλουμε κωδικό για να ορίσεις νέο."
          : `Αν το ${sentTo} ανήκει σε λογαριασμό, θα λάβεις εκεί κωδικό 6 ψηφίων. Ισχύει για 15 λεπτά.`
      }
      bottomOffset={ROOM_FOR_RULES}
    >
      {sentTo === null ? (
        <>
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
          <FormMessage error={error} notice={notice} />
          <Button
            label="Αποστολή κωδικού"
            onPress={() => send(false)}
            disabled={!canSend}
            pending={pending}
          />
        </>
      ) : (
        <>
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
          <FormMessage error={error} notice={notice} />
          <Button label="Αποθήκευση" onPress={save} disabled={!canSave} pending={pending} />
          <TextLink label="Στείλε νέο κωδικό" onPress={() => send(true)} disabled={pending} />
        </>
      )}

      <TextLink label="Πίσω στη σύνδεση" onPress={() => router.back()} />
    </AuthForm>
  );
}
