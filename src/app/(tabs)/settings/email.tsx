import { router } from "expo-router";
import { useRef, useState } from "react";
import { Text, type TextInput } from "react-native";

import { Button } from "@/components/button";
import { FormMessage, ROOM_FOR_BUTTON, SettingsForm } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import { TextLink } from "@/components/text-link";
import { useAction } from "@/lib/action";
import { api } from "@/lib/api";
import { confirmEmail } from "@/lib/schedule";
import { typography, useColors } from "@/lib/theme";

export default function ChangeEmailScreen() {
  const colors = useColors();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const { pending, error, setError, notice, setNotice, run } = useAction();

  const canSend = email.trim() !== "" && password !== "";

  function send(again: boolean) {
    if (!canSend) return;
    void run(async () => {
      await api("/api/user-profile/email", { body: { email, password } });
      setSentTo(email.trim().toLowerCase());
      if (again) setNotice("Σου στείλαμε νέο κωδικό. Ο προηγούμενος δεν ισχύει πια.");
    });
  }

  function confirm() {
    if (code.trim().length !== 6) return;
    void run(async () => {
      await confirmEmail(code);
      router.back();
    });
  }

  return (
    <SettingsForm bottomOffset={ROOM_FOR_BUTTON}>
      {sentTo === null ? (
        <>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Θα στείλουμε κωδικό στο νέο email, για να επιβεβαιώσεις ότι είναι δικό σου. Μέχρι
            τότε ο λογαριασμός κρατά το τωρινό.
          </Text>
          <TextField
            label="Νέο email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={passwordRef}
            label="Κωδικός πρόσβασης"
            secret
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
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
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Στείλαμε κωδικό 6 ψηφίων στο {sentTo}. Ισχύει για 15 λεπτά.
          </Text>
          <TextField
            label="Κωδικός από το email"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={confirm}
          />
          <FormMessage error={error} notice={notice} />
          <Button
            label="Επιβεβαίωση"
            onPress={confirm}
            disabled={code.trim().length !== 6}
            pending={pending}
          />
          <TextLink label="Στείλε νέο κωδικό" onPress={() => send(true)} disabled={pending} />
          <TextLink
            label="Άλλο email"
            onPress={() => {
              setSentTo(null);
              setCode("");
              setError(null);
              setNotice(null);
            }}
            disabled={pending}
          />
        </>
      )}
    </SettingsForm>
  );
}
