import { router } from "expo-router";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";

import { Button } from "@/components/button";
import { AuthForm, FormMessage, ROOM_FOR_BUTTON } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import { TextLink } from "@/components/text-link";
import { useAction } from "@/lib/action";
import { api } from "@/lib/api";
import type { LoginReply } from "@/lib/contract";
import { signInWith, useSession } from "@/lib/session";

export default function SignInScreen() {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, run } = useAction();
  const passwordRef = useRef<TextInput>(null);

  const notice = session.status === "signedOut" ? session.notice : undefined;
  const ready = email.trim() !== "" && password !== "";

  function submit() {
    if (!ready) return;
    // Signed in another way meanwhile, say through a password reset: leave that session be.
    void run(async () => {
      await signInWith(() => api<LoginReply>("/api/auth/login", { body: { email, password } }));
    });
  }

  return (
    <AuthForm
      title="Athlisis"
      subtitle="Συνδέσου με το email και τον κωδικό σου."
      bottomOffset={ROOM_FOR_BUTTON}
    >
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

      <FormMessage error={error ?? notice} />

      <Button label="Σύνδεση" onPress={submit} disabled={!ready} pending={pending} />

      <TextLink
        label="Ξέχασες τον κωδικό;"
        onPress={() =>
          router.push({ pathname: "/forgot-password", params: { email: email.trim() } })
        }
      />
    </AuthForm>
  );
}
