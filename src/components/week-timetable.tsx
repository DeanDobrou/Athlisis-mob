import { StyleSheet, Text, View } from "react-native";

import { addDays, WEEKDAYS } from "@/lib/dates";
import type { MemberClass } from "@/lib/schedule";
import { radius, readableOn, spacing, typography, useColors } from "@/lib/theme";

const TIME_COLUMN = 44;
const GAP = 6;
const CELL_HEIGHT = 46;
const DAY_NAMES = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"];

/** One week as a timetable: a row per class time, a column per weekday. */
export function WeekTimetable({
  week,
  classes,
  width,
  today,
}: {
  week: string;
  classes: MemberClass[];
  width: number;
  today: string;
}) {
  const colors = useColors();
  const days = WEEKDAYS.map((label, i) => ({ label, day: addDays(week, i), name: DAY_NAMES[i] }));
  const times = [...new Set(classes.map((c) => c.start_time))].sort();
  const bySlot = new Map(classes.map((c) => [`${c.day} ${c.start_time}`, c]));
  const cellWidth = (width - spacing.lg * 2 - TIME_COLUMN - GAP * 5) / 5;
  const types = [...new Map(classes.flatMap((c) => c.types).map((t) => [t.id, t])).values()];

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
              <Text style={[typography.footnote, { color: colors.textMuted }]}>
                {label}
              </Text>
              <View
                style={[
                  styles.dayNumber,
                  isToday && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    typography.subhead,
                    styles.bold,
                    { color: isToday ? colors.onPrimary : colors.text },
                  ]}
                >
                  {Number(day.slice(8))}
                </Text>
              </View>
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
            />
          ))}
        </View>
      ))}

      <View style={styles.legend}>
        {types.map((type) => (
          <View key={type.id} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: type.color_hex }]} />
            <Text style={[typography.footnote, { color: colors.textMuted }]}>
              {type.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Cell({
  item,
  width,
  dayName,
}: {
  item: MemberClass | undefined;
  width: number;
  dayName: string;
}) {
  const colors = useColors();
  if (!item) return <View style={{ width, height: CELL_HEIGHT }} />;

  const cancelled = item.status === "cancelled";
  const mine = item.my_booking !== null;
  const left = Math.max(0, item.capacity - item.booked);
  const full = left === 0 && !mine;
  const color = cancelled ? undefined : item.types[0]?.color_hex;
  const background = color ?? colors.surfaceMuted;
  const ink = color ? readableOn(color) : colors.textMuted;
  const mark = cancelled ? "×" : mine ? "✓" : String(left);
  const names = item.types.map((t) => t.name).join(" και ") || "Μάθημα";
  const state = cancelled
    ? "ακυρώθηκε"
    : mine
      ? "έχεις κλείσει θέση"
      : full
        ? "πλήρες"
        : `${left} ${left === 1 ? "θέση" : "θέσεις"}`;

  return (
    <View
      accessible
      accessibilityLabel={`${dayName} ${item.start_time}, ${names}, ${state}`}
      style={[
        styles.cell,
        {
          width,
          backgroundColor: background,
          opacity: item.is_past || full || cancelled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={[typography.headline, { color: ink }]}>{mark}</Text>
      {!cancelled && item.types[1] && (
        <View style={[styles.stripe, { backgroundColor: item.types[1].color_hex }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: GAP },
  row: { flexDirection: "row", alignItems: "center", gap: GAP },
  dayHeader: { alignItems: "center", gap: spacing.xs, paddingBottom: spacing.xs },
  dayNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  bold: { fontWeight: "600" },
  time: { fontVariant: ["tabular-nums"] },
  cell: {
    height: CELL_HEIGHT,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 5 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});
