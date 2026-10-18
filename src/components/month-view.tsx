import { Pressable, StyleSheet, Text, View } from "react-native";

import { TypeNames } from "@/components/type-names";
import type { MemberClass } from "@/lib/contract";
import {
  addDays,
  firstTrainingDay,
  shortDate,
  weekdayName,
  WEEKDAYS,
  weekStart,
} from "@/lib/dates";
import { radius, spacing, typography, useColors } from "@/lib/theme";
import { classLook, classStatus, hasBooking, type ClassStatus } from "@/lib/training";

/** Every month's Monday-to-Friday days fit in five rows. */
const ROWS = 5;
const CIRCLE = 38;
const RING = 46;
const DAY_HEIGHT = 50;
const CARD_PADDING = 6;

/** One month as a grid of its Monday-to-Friday days. */
export function MonthGrid({
  month,
  byDay,
  width,
  today,
  selected,
  onSelect,
}: {
  month: string;
  byDay: Map<string, MemberClass[]>;
  width: number;
  today: string;
  selected: string;
  onSelect: (day: string) => void;
}) {
  const colors = useColors();
  const first = weekStart(firstTrainingDay(month));
  const cellWidth = (width - CARD_PADDING * 2) / 5;
  const rows = Array.from({ length: ROWS }, (_, row) =>
    WEEKDAYS.map((_, column) => addDays(first, row * 7 + column)),
  );

  return (
    <View style={[styles.page, { width }]}>
      <View>
        <View style={styles.row}>
          {WEEKDAYS.map((label) => (
            <Text
              key={label}
              style={[typography.footnote, styles.label, { width: cellWidth, color: colors.textMuted }]}
            >
              {label}
            </Text>
          ))}
        </View>
        {rows.map((days) => (
          <View key={days[0]} style={styles.row}>
            {days.map((day) =>
              day.slice(0, 7) === month.slice(0, 7) ? (
                <Day
                  key={day}
                  day={day}
                  classes={byDay.get(day) ?? []}
                  width={cellWidth}
                  today={today}
                  selected={day === selected}
                  onSelect={onSelect}
                />
              ) : (
                <View key={day} style={{ width: cellWidth, height: DAY_HEIGHT }} />
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function Day({
  day,
  classes,
  width,
  today,
  selected,
  onSelect,
}: {
  day: string;
  classes: MemberClass[];
  width: number;
  today: string;
  selected: boolean;
  onSelect: (day: string) => void;
}) {
  const colors = useColors();
  const running = classes.filter((c) => c.status !== "cancelled");
  const booked = hasBooking(classes);
  const isToday = day === today;
  const ink = booked
    ? colors.onPrimary
    : isToday || running.length > 0
      ? colors.text
      : colors.textMuted;
  const label = [
    `${weekdayName(day)} ${shortDate(day)}`,
    running.length === 0
      ? "χωρίς μαθήματα"
      : `${running.length} ${running.length === 1 ? "μάθημα" : "μαθήματα"}`,
    booked && "έχεις κλείσει θέση",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => onSelect(day)}
      style={({ pressed }) => [
        styles.day,
        { width, opacity: pressed ? 0.6 : day < today && !selected ? 0.4 : 1 },
      ]}
    >
      <View style={[styles.ring, selected && { borderColor: colors.primary }]}>
        <View
          style={[
            styles.circle,
            booked
              ? { backgroundColor: colors.primary }
              : isToday && { backgroundColor: colors.primarySoft },
          ]}
        >
          <Text
            style={[typography.body, (booked || isToday) && styles.bold, { color: ink }]}
          >
            {Number(day.slice(8))}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** One day's classes as a list, each opening its sheet. */
export function DayClasses({
  day,
  classes,
  now,
  onOpen,
}: {
  day: string;
  classes: MemberClass[];
  now: Date;
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();

  return (
    <View style={styles.list}>
      <Text style={[typography.headline, { color: colors.text }]}>
        {weekdayName(day)} {shortDate(day)}
      </Text>
      {classes.length === 0 ? (
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Δεν υπάρχουν μαθήματα αυτή τη μέρα.
        </Text>
      ) : (
        classes.map((item) => (
          <ClassRow
            key={item.id}
            item={item}
            status={classStatus(item, classes, now)}
            onOpen={onOpen}
          />
        ))
      )}
    </View>
  );
}

function ClassRow({
  item,
  status,
  onOpen,
}: {
  item: MemberClass;
  status: ClassStatus;
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();
  const { look, text } = classLook(status);
  const mine = look === "booked" || look === "attended";
  // Only a class still to come, booked or open, shows at full strength.
  const faded = look !== "booked" && look !== "open";
  const ink = mine ? colors.onPrimary : colors.text;
  const types = item.types.map((t) => t.name).join(" · ") || "Μάθημα";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.start_time}, ${types}, ${text}`}
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => [
        styles.classRow,
        {
          backgroundColor: mine ? colors.primary : colors.surface,
          borderColor: mine ? colors.primary : colors.border,
          opacity: faded ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.grow}>
        <Text style={[typography.headline, styles.nums, { color: ink }]}>
          {item.start_time} - {item.end_time}
        </Text>
        <TypeNames
          types={item.types}
          style={[typography.subhead, { color: mine ? colors.onPrimary : colors.textMuted }]}
        />
      </View>
      <Text style={[typography.subhead, { color: ink }]}>{mine ? "✓" : text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The calendar card around it supplies the background and border.
  page: { paddingHorizontal: CARD_PADDING, paddingBottom: CARD_PADDING },
  row: { flexDirection: "row" },
  label: { textAlign: "center", paddingBottom: spacing.sm },
  day: { height: DAY_HEIGHT, alignItems: "center", justifyContent: "center" },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bold: { fontWeight: "600" },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: "continuous",
  },
  grow: { flex: 1, gap: 2 },
  nums: { fontVariant: ["tabular-nums"] },
});
