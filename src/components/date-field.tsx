import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { longDate, today } from "@/lib/dates";
import { radius, spacing, typography, useColors } from "@/lib/theme";

/** A labelled past date, picked with the system date picker. `value` is YYYY-MM-DD or null. */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (day: string) => void;
}) {
  const colors = useColors();
  // Noon keeps the day the same in every timezone the picker might convert through.
  const date = new Date(`${value ?? "1990-01-01"}T12:00:00`);
  const latest = new Date();
  const box = [styles.box, { backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <View style={styles.field}>
      <Text style={[typography.subhead, { color: colors.textMuted }]}>{label}</Text>
      {process.env.EXPO_OS === "ios" ? (
        <View style={box}>
          <DateTimePicker
            accessibilityLabel={label}
            value={date}
            mode="date"
            display="compact"
            locale="el-GR"
            maximumDate={latest}
            accentColor={colors.primary}
            onChange={(_, picked) => picked && onChange(today(picked))}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${value ? longDate(value) : "κενό"}`}
          onPress={() =>
            DateTimePickerAndroid.open({
              value: date,
              mode: "date",
              maximumDate: latest,
              onChange: (event, picked) => {
                if (event.type === "set" && picked) onChange(today(picked));
              },
            })
          }
          style={box}
        >
          <Text style={[typography.body, { color: value ? colors.text : colors.textMuted }]}>
            {value ? longDate(value) : "Διάλεξε ημερομηνία"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  box: {
    height: 50,
    justifyContent: "center",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
  },
});
