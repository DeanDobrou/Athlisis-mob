import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  LayoutAnimationConfig,
  useReducedMotion,
} from "react-native-reanimated";

import { DayPage, EASING, RESIZE } from "@/components/week-days";
import type { MemberClass } from "@/lib/contract";
import {
  addDays,
  firstTrainingDay,
  shortDate,
  weekdayName,
  WEEKDAYS,
  weekStart,
} from "@/lib/dates";
import { spacing, typography, useColors } from "@/lib/theme";
import { hasBooking } from "@/lib/training";

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

/**
 * One day in the grid, marked as the week's strip marks it: today in a solid circle, a dot
 * under the number on a day the member holds a place, past and empty days in grey.
 */
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
  const ink = isToday
    ? colors.onPrimary
    : day < today || running.length === 0
      ? colors.textMuted
      : colors.text;
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
      style={({ pressed }) => [styles.day, { width, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.ring, selected && { borderColor: colors.primary }]}>
        <View style={[styles.circle, isToday && { backgroundColor: colors.primary }]}>
          <Text style={[typography.body, isToday && styles.bold, { color: ink }]}>
            {Number(day.slice(8))}
          </Text>
          {booked && <View style={[styles.bookedDot, { backgroundColor: ink }]} />}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * The picked day's classes, drawn as the week view draws a day. A new day comes in from the
 * side it lies on, and the card around it follows its height.
 */
export function DayClasses({
  day,
  classes,
  today,
  now,
  width,
  activeId,
  onOpen,
}: {
  day: string;
  classes: MemberClass[];
  today: string;
  now: Date;
  width: number;
  /** The class whose sheet is open, kept marked behind it. */
  activeId: string | null;
  onOpen: (classId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [moved, setMoved] = useState({ day, forward: true });
  if (moved.day !== day) setMoved({ day, forward: day > moved.day });
  // The day whose finished classes are unfolded; another day starts folded again.
  const [unfolded, setUnfolded] = useState<string | null>(null);
  const toggle = useCallback((d: string) => setUnfolded((open) => (open === d ? null : d)), []);
  const [height, setHeight] = useState<number>();
  const measure = useCallback((_day: string, h: number) => setHeight(h), []);

  return (
    <Animated.View
      style={{
        height,
        overflow: "hidden",
        transitionProperty: "height",
        transitionDuration: reduceMotion ? 0 : 250,
        transitionTimingFunction: RESIZE,
      }}
    >
      {/* Only a change of day slides in, not the list's first draw. */}
      <LayoutAnimationConfig skipEntering>
        <Animated.View
          key={day}
          entering={(moved.forward ? FadeInRight : FadeInLeft).duration(250).easing(EASING)}
        >
          <DayPage
            day={day}
            classes={classes}
            today={today}
            now={now}
            width={width}
            activeId={activeId}
            onOpen={onOpen}
            onHeight={measure}
            showDone={unfolded === day}
            onToggle={toggle}
          />
        </Animated.View>
      </LayoutAnimationConfig>
    </Animated.View>
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
  bookedDot: { position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 2 },
  bold: { fontWeight: "600" },
});
