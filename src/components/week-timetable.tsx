import { SymbolView } from "expo-symbols";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TypeBar } from "@/components/type-names";
import { addDays, timeBefore, WEEKDAY_NAMES, WEEKDAYS } from "@/lib/dates";
import type { MemberClass } from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";
import { FEW_PLACES } from "@/lib/training";

/** Inside the calendar card. */
const PAD = 10;
const TIME_COLUMN = 40;
const GAP = 6;
const CHECK = { ios: "checkmark", android: "check", web: "check" } as const;

/** How a class reads for the member: booked, cancelled, full or places left. */
export function classState(item: MemberClass) {
  const cancelled = item.status === "cancelled";
  const mine = item.my_booking !== null && !cancelled;
  const left = Math.max(0, item.capacity - item.booked);
  const full = left === 0 && item.my_booking === null;
  return {
    cancelled,
    mine,
    left,
    full,
    faded: item.is_past || full || cancelled,
    text: cancelled
      ? "ακυρώθηκε"
      : mine
        ? "έχεις κλείσει θέση"
        : full
          ? "πλήρες"
          : `${left} ${left === 1 ? "θέση" : "θέσεις"}`,
  };
}

const typesKey = (item: MemberClass) => item.types.map((t) => t.id).join("+");

/** A day's programme: the class whose type mix most of the day's classes share. */
function programmeOf(classes: MemberClass[]): MemberClass | undefined {
  const running = classes.filter((c) => c.status !== "cancelled");
  const count = (c: MemberClass) => running.filter((o) => typesKey(o) === typesKey(c)).length;
  return running.reduce<MemberClass | undefined>(
    (best, c) => (best && count(best) >= count(c) ? best : c),
    undefined,
  );
}

/** Diagonal hatching, for a full class. */
function hatch(color: string) {
  return {
    experimental_backgroundImage: `linear-gradient(135deg, ${color} 0% 25%, transparent 25% 50%, ${color} 50% 75%, transparent 75% 100%)`,
    experimental_backgroundSize: "8px 8px",
  };
}

/**
 * One week as a timetable: a row per class time, a column per weekday. Each
 * day's type colours sit in its header; a class carries its own only when it
 * differs from its day. Memoised, so moving between weeks only renders the
 * pages whose classes changed.
 */
export const WeekTimetable = memo(function WeekTimetable({
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
  const days = WEEKDAYS.map((label, i) => {
    const day = addDays(week, i);
    return {
      label,
      day,
      name: WEEKDAY_NAMES[i],
      programme: programmeOf(classes.filter((c) => c.day === day)),
    };
  });
  const times = [...new Set(classes.map((c) => c.start_time))].sort();
  const bySlot = new Map(classes.map((c) => [`${c.day} ${c.start_time}`, c]));
  const cellWidth = (width - PAD * 2 - TIME_COLUMN - GAP * 5) / 5;
  const todayIndex = days.findIndex(({ day }) => day === today);

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
      <View style={styles.grid}>
        {todayIndex !== -1 && (
          <View
            style={[
              styles.todayColumn,
              {
                left: TIME_COLUMN + GAP / 2 + todayIndex * (cellWidth + GAP),
                width: cellWidth + GAP,
                backgroundColor: colors.todayTint,
              },
            ]}
          />
        )}

        <View style={styles.row}>
          <View style={{ width: TIME_COLUMN }} />
          {days.map(({ label, day, programme }) => {
            const isToday = day === today;
            const ink = day < today ? colors.textMuted : colors.text;
            return (
              <View key={day} style={[styles.dayHeader, { width: cellWidth }]}>
                <Text style={[styles.weekday, { color: ink }]}>{label}</Text>
                <View style={[styles.date, isToday && { backgroundColor: colors.primary }]}>
                  <Text
                    style={[
                      typography.subhead,
                      styles.bold,
                      styles.nums,
                      { color: isToday ? colors.onPrimary : ink },
                    ]}
                  >
                    {Number(day.slice(8))}
                  </Text>
                </View>
                <TypeBar
                  types={programme?.types ?? []}
                  style={{ width: cellWidth - 12, height: 5 }}
                />
              </View>
            );
          })}
        </View>

        {times.map((time, i) => (
          <View
            key={time}
            // A wider gap where the day breaks, as between the morning and evening classes.
            style={[styles.row, i > 0 && timeBefore(time, 60) > times[i - 1] && styles.split]}
          >
            <Text style={[typography.footnote, styles.time, { color: colors.text }]}>{time}</Text>
            {days.map(({ day, name, programme }) => {
              const item = bySlot.get(`${day} ${time}`);
              return (
                <Cell
                  key={day}
                  item={item}
                  showTypes={!!item && !!programme && typesKey(item) !== typesKey(programme)}
                  width={cellWidth}
                  dayName={name}
                  onOpen={onOpen}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
});

function Cell({
  item,
  showTypes,
  width,
  dayName,
  onOpen,
}: {
  item: MemberClass | undefined;
  showTypes: boolean;
  width: number;
  dayName: string;
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();
  if (!item) return <View style={{ width, height: width }} />;

  const state = classState(item);
  const booked = state.mine && !item.is_past;
  const attended = state.mine && item.is_past;
  const gone = item.is_past && !state.mine && !state.cancelled;
  const full = state.full && !gone && !state.cancelled;
  const names = item.types.map((t) => t.name).join(" και ") || "Μάθημα";
  const status = attended ? "είχες κλείσει θέση" : gone ? "έχει περάσει" : state.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dayName} ${item.start_time}, ${names}, ${status}`}
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => [
        styles.cell,
        // Soft tiles on the card; a past class is left as a bare outline.
        // Square at any screen width.
        { width, height: width, backgroundColor: colors.groupedBackground, borderColor: "transparent" },
        booked && { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 1.5 },
        attended && { borderColor: colors.primary, borderWidth: 1.5 },
        state.cancelled && {
          backgroundColor: "transparent",
          borderColor: colors.textMuted,
          borderStyle: "dashed",
          opacity: 0.6,
        },
        full && hatch(colors.border),
        gone && { backgroundColor: "transparent", borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.main}>
        {state.cancelled ? (
          <SymbolView
            name={{ ios: "nosign", android: "block", web: "block" }}
            size={18}
            tintColor={colors.textMuted}
          />
        ) : state.mine ? (
          <SymbolView
            name={CHECK}
            size={20}
            tintColor={booked ? colors.onPrimary : colors.primary}
          />
        ) : gone ? (
          <Text style={[styles.left, { color: colors.textMuted }]}>–</Text>
        ) : full ? (
          <Text style={[styles.full, { color: colors.textMuted }]}>Πλήρες</Text>
        ) : (
          <Text
            style={[
              styles.left,
              { color: state.left <= FEW_PLACES ? colors.warning : colors.text },
            ]}
          >
            {state.left}
          </Text>
        )}
      </View>
      {showTypes && !gone && <TypeBar types={item.types} style={styles.cellBar} />}
    </Pressable>
  );
}

/** What the cells mean, and the colour of each class type in the week. */
export function WeekLegend({ classes }: { classes: MemberClass[] }) {
  const colors = useColors();
  const types = [...new Map(classes.flatMap((c) => c.types).map((t) => [t.id, t])).values()];
  const text = [typography.footnote, { color: colors.textMuted }];
  const swatch = [
    styles.swatch,
    { backgroundColor: colors.groupedBackground, borderColor: colors.border },
  ];

  return (
    <View style={styles.legend}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={swatch}>
            <Text style={[styles.swatchText, { color: colors.text }]}>7</Text>
          </View>
          <Text style={text}>ελεύθερες θέσεις</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <SymbolView name={CHECK} size={11} tintColor={colors.onPrimary} />
          </View>
          <Text style={text}>κράτησή σου</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[swatch, hatch(colors.border)]} />
          <Text style={text}>πλήρες</Text>
        </View>
      </View>
      <View style={styles.legendRow}>
        {types.map((t) => (
          <View key={t.id} style={styles.legendItem}>
            <View style={[styles.typeMark, { backgroundColor: t.color_hex ?? "transparent" }]} />
            <Text style={text}>{t.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Room above and below for today's column, which reaches past the grid.
  page: { paddingHorizontal: PAD, paddingTop: GAP, paddingBottom: PAD + GAP },
  grid: { gap: GAP },
  todayColumn: {
    position: "absolute",
    top: -GAP,
    bottom: -GAP,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  row: { flexDirection: "row", gap: GAP },
  split: { marginTop: GAP },
  dayHeader: { alignItems: "center", gap: 3, paddingTop: 2, paddingBottom: spacing.xs },
  weekday: { fontSize: 11, fontWeight: "600" },
  date: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bold: { fontWeight: "700" },
  nums: { fontVariant: ["tabular-nums"] },
  time: { width: TIME_COLUMN, alignSelf: "center", fontVariant: ["tabular-nums"] },
  cell: {
    padding: 7,
    paddingBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  main: { flex: 1, alignItems: "center", justifyContent: "center" },
  left: { fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  full: { fontSize: 10, fontWeight: "700" },
  cellBar: { height: 4 },
  legend: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  swatchText: { fontSize: 10, fontWeight: "700" },
  typeMark: { width: 12, height: 4, borderRadius: 2 },
});
