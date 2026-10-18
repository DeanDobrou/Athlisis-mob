import { router } from "expo-router";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";

import { Button } from "@/components/button";
import { FormMessage, ROOM_FOR_RULES, SettingsForm } from "@/components/form-screen";
import { PasswordRules } from "@/components/password-rules";
import { TextField } from "@/components/text-field";
import { useAction } from "@/lib/action";
import { api } from "@/lib/api";
import type { TokenReply } from "@/lib/contract";
import { passwordRules } from "@/lib/password";
import { signInWith } from "@/lib/session";

export default function ChangePasswordScreen() {
  const newRef = useRef<TextInput>(null);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, run } = useAction();

  const ready = current !== "" && passwordRules(password).every((rule) => rule.met);

  function submit() {
    if (!ready) return;
    void run(async () => {
      // Signed out meanwhile: the new token must not sign this member back in.
      const changed = await signInWith(() =>
        api<TokenReply>("/api/user-profile/password", {
          body: { currentPassword: current, newPassword: password },
        }),
      );
      if (changed) router.back();
    });
  }

  return (
    <SettingsForm bottomOffset={ROOM_FOR_RULES}>
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

      <FormMessage error={error} />

      <Button label="Αποθήκευση" onPress={submit} disabled={!ready} pending={pending} />
    </SettingsForm>
  );
}
