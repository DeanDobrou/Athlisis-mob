import { useState, type Ref } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { radius, spacing, typography, useColors } from "@/lib/theme";

/** A labelled text input. With `secret`, the value is hidden behind a show/hide toggle. */
export function TextField({
  label,
  secret = false,
  ref,
  onFocus,
  onBlur,
  ...input
}: TextInputProps & {
  label: string;
  secret?: boolean;
  ref?: Ref<TextInput>;
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[typography.subhead, { color: colors.textMuted }]}>
        {label}
      </Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.surface,
            borderColor: focused ? colors.primary : colors.border,
          },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          {...input}
          secureTextEntry={secret && !shown}
          style={[styles.input, typography.body, { color: colors.text }]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secret && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
            hitSlop={spacing.md}
            onPress={() => setShown((value) => !value)}
          >
            <SymbolView
              name={
                shown
                  ? { ios: "eye.slash", android: "visibility_off", web: "visibility_off" }
                  : { ios: "eye", android: "visibility", web: "visibility" }
              }
              size={22}
              tintColor={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 50,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
  },
  input: { flex: 1, height: "100%" },
});
