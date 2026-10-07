import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Button } from "@/components/button";
import { DateField } from "@/components/date-field";
import { TextField } from "@/components/text-field";
import { errorMessage } from "@/lib/api";
import { saveProfile, useSchedule, type Profile } from "@/lib/schedule";
import { radius, spacing, typography, useColors } from "@/lib/theme";

/** Space kept under the focused field, so the button below the form stays above the keyboard. */
const BOTTOM_OFFSET = 140;

export default function ProfileScreen() {
  const { profile } = useSchedule();
  return profile ? <ProfileForm profile={profile} /> : null;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const colors = useColors();
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [birth, setBirth] = useState(profile.date_of_birth);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed =
    firstName !== profile.first_name ||
    lastName !== profile.last_name ||
    phone !== (profile.phone ?? "") ||
    birth !== profile.date_of_birth;
  const ready = changed && firstName.trim() !== "" && lastName.trim() !== "";

  async function save() {
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    try {
      await saveProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone.trim() || null,
        date_of_birth: birth,
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      bottomOffset={BOTTOM_OFFSET}
    >
      <TextField
        label="Όνομα"
        value={firstName}
        onChangeText={setFirstName}
        maxLength={100}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => lastNameRef.current?.focus()}
      />
      <TextField
        ref={lastNameRef}
        label="Επώνυμο"
        value={lastName}
        onChangeText={setLastName}
        maxLength={100}
        autoCapitalize="words"
        autoComplete="family-name"
        textContentType="familyName"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <TextField
        ref={phoneRef}
        label="Τηλέφωνο"
        value={phone}
        onChangeText={setPhone}
        maxLength={30}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <DateField label="Ημερομηνία γέννησης" value={birth} onChange={setBirth} />

      <View style={styles.field}>
        <Text style={[typography.subhead, { color: colors.textMuted }]}>Email</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Email ${profile.email}, αλλαγή`}
          onPress={() => router.push("/settings/email")}
          style={({ pressed }) => [
            styles.email,
            {
              backgroundColor: pressed ? colors.accent : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text numberOfLines={1} style={[typography.body, styles.grow, { color: colors.text }]}>
            {profile.email}
          </Text>
          <Text style={[typography.subhead, styles.change, { color: colors.primary }]}>
            Αλλαγή
          </Text>
        </Pressable>
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

      <Button label="Αποθήκευση" onPress={save} disabled={!ready} pending={pending} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  field: { gap: spacing.xs },
  email: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 50,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
  },
  grow: { flex: 1 },
  change: { fontWeight: "600" },
});
