import { Pressable, StyleSheet, Text, View } from "react-native";

import { addDays, WEEKDAY_NAMES, WEEKDAYS } from "@/lib/dates";
import type { MemberClass } from "@/lib/schedule";
import { radius, spacing, typography, useColors } from "@/lib/theme";

const TIME_COLUMN = 44;
const GAP = 6;
const CELL_HEIGHT = 46;

/** How a class reads for the member: booked, cancelled, full or places left. */
export function classState(item: MemberClass) {
  const cancelled = item.status === "cancelled";
  const mine = item.my_booking !== null && !cancelled;
  const left = Math.max(0, item.capacity - item.booked);
  const full = left === 0 && item.my_booking === null;
  return {
    mine,
    faded: item.is_past || full || cancelled,
    mark: cancelled ? "×" : mine ? "✓" : String(left),
    text: cancelled
      ? "ακυρώθηκε"
      : mine
        ? "έχεις κλείσει θέση"
        : full
          ? "πλήρες"
          : `${left} ${left === 1 ? "θέση" : "θέσεις"}`,
  };
}

/** One week as a timetable: a row per class time, a column per weekday. */
export function WeekTimetable({
  week,
  classes,
  width,
  today,
  onOpen,
}: {
  week: string;
  classes: MemberClass[];
  width: number;
  today: string;
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();
  const days = WEEKDAYS.map((label, i) => ({ label, day: addDays(week, i), name: WEEKDAY_NAMES[i] }));
  const times = [...new Set(classes.map((c) => c.start_time))].sort();
  const bySlot = new Map(classes.map((c) => [`${c.day} ${c.start_time}`, c]));
  const cellWidth = (width - spacing.lg * 2 - TIME_COLUMN - GAP * 5) / 5;

  if (times.length === 0) {
    return (
      <View style={[styles.page, { width }]}>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Το πρόγραμμα αυτής της εβδομάδας δεν έχει βγει ακόμη.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.row}>
        <View style={{ width: TIME_COLUMN }} />
        {days.map(({ label, day }) => {
          const isToday = day === today;
          return (
            <View key={day} style={[styles.dayHeader, { width: cellWidth }]}>
              <Text
                style={[
                  typography.footnote,
                  isToday && styles.bold,
                  { color: isToday ? colors.text : colors.textMuted },
                ]}
              >
                {label}
              </Text>
              <Text
                style={[
                  typography.subhead,
                  styles.bold,
                  { color: isToday ? colors.text : colors.textMuted },
                ]}
              >
                {Number(day.slice(8))}
              </Text>
            </View>
          );
        })}
      </View>

      {times.map((time) => (
        <View key={time} style={styles.row}>
          <Text
            style={[
              typography.footnote,
              styles.time,
              { width: TIME_COLUMN, color: colors.textMuted },
            ]}
          >
            {time}
          </Text>
          {days.map(({ day, name }) => (
            <Cell
              key={day}
              item={bySlot.get(`${day} ${time}`)}
              width={cellWidth}
              dayName={name}
              onOpen={onOpen}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function Cell({
  item,
  width,
  dayName,
  onOpen,
}: {
  item: MemberClass | undefined;
  width: number;
  dayName: string;
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();
  if (!item) return <View style={{ width, height: CELL_HEIGHT }} />;

  const state = classState(item);
  const background = state.mine ? colors.primary : colors.surface;
  const ink = state.mine ? colors.onPrimary : colors.text;
  const names = item.types.map((t) => t.name).join(" και ") || "Μάθημα";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dayName} ${item.start_time}, ${names}, ${state.text}`}
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => [
        styles.cell,
        {
          width,
          backgroundColor: background,
          borderColor: state.mine ? colors.primary : colors.border,
          opacity: state.faded ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[typography.headline, { color: ink }]}>{state.mark}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: GAP },
  row: { flexDirection: "row", alignItems: "center", gap: GAP },
  dayHeader: { alignItems: "center", gap: spacing.xs, paddingBottom: spacing.xs },
  bold: { fontWeight: "600" },
  time: { fontVariant: ["tabular-nums"] },
  cell: {
    height: CELL_HEIGHT,
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
