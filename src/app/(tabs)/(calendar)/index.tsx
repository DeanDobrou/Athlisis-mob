import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Button } from "@/components/button";
import { WeekTimetable } from "@/components/week-timetable";
import { addDays, openingWeek, shortDate, today, weekStart } from "@/lib/dates";
import {
  loadSchedule,
  refreshSchedule,
  useSchedule,
  type MemberClass,
} from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";

/** The weeks to page through: the first week with classes to the last. */
function weeksAround(opening: string, classes: MemberClass[]): string[] {
  let first = opening;
  let last = opening;
  for (const c of classes) {
    const week = weekStart(c.day);
    if (week < first) first = week;
    if (week > last) last = week;
  }
  const weeks = [first];
  while (weeks[weeks.length - 1] < last) {
    weeks.push(addDays(weeks[weeks.length - 1], 7));
  }
  return weeks;
}

export default function CalendarScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { classes, refreshing, error } = useSchedule();
  const [shown, setShown] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const list = useRef<FlatList<string>>(null);
  const router = useRouter();

  const day = today();
  const opening = openingWeek(day);
  const weeks = useMemo(
    () => weeksAround(opening, classes ?? []),
    [opening, classes],
  );
  const byWeek = useMemo(() => {
    const map = new Map<string, MemberClass[]>();
    for (const c of classes ?? []) {
      const week = weekStart(c.day);
      map.set(week, [...(map.get(week) ?? []), c]);
    }
    return map;
  }, [classes]);
  const openingIndex = weeks.indexOf(opening);
  const current = shown && weeks.includes(shown) ? weeks.indexOf(shown) : openingIndex;
  const week = weeks[current];

  useEffect(() => {
    void loadSchedule();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void refreshSchedule();
    });
    return () => subscription.remove();
  }, []);

  function goTo(index: number) {
    list.current?.scrollToIndex({ index, animated: true });
    setShown(weeks[index]);
  }

  async function pull() {
    setPulling(true);
    await refreshSchedule();
    setPulling(false);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={pull} />}
    >
      <View style={styles.bar}>
        <WeekArrow direction="left" disabled={current === 0} onPress={() => goTo(current - 1)} />
        <Text style={[typography.headline, styles.range, { color: colors.text }]}>
          {shortDate(week)} - {shortDate(addDays(week, 4))}
        </Text>
        <WeekArrow
          direction="right"
          disabled={current === weeks.length - 1}
          onPress={() => goTo(current + 1)}
        />
        {current !== openingIndex && (
          <Pressable accessibilityRole="button" onPress={() => goTo(openingIndex)} hitSlop={spacing.sm}>
            <Text style={[typography.subhead, { color: colors.textMuted }]}>Σήμερα</Text>
          </Pressable>
        )}
      </View>

      {error && classes && (
        <Text style={[typography.footnote, styles.notice, { color: colors.textMuted }]}>
          Δεν ήταν δυνατή η ενημέρωση. Βλέπεις την τελευταία αποθηκευμένη εικόνα.
        </Text>
      )}

      {classes === null ? (
        <View style={styles.status}>
          {error ? (
            <>
              <Text style={[typography.body, { color: colors.textMuted }]}>{error}</Text>
              <Button label="Δοκίμασε ξανά" onPress={() => void refreshSchedule()} pending={refreshing} />
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      ) : (
        <FlatList
          key={`${weeks[0]}:${weeks.length}`}
          ref={list}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={weeks}
          keyExtractor={(item) => item}
          initialScrollIndex={current}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) =>
            setShown(weeks[Math.round(e.nativeEvent.contentOffset.x / width)])
          }
          renderItem={({ item }) => (
            <WeekTimetable
              week={item}
              classes={byWeek.get(item) ?? []}
              width={width}
              today={day}
              onOpen={(id) => router.push({ pathname: "/class/[id]", params: { id } })}
            />
          )}
        />
      )}
    </ScrollView>
  );
}

function WeekArrow({
  direction,
  disabled,
  onPress,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const left = direction === "left";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={left ? "Προηγούμενη εβδομάδα" : "Επόμενη εβδομάδα"}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      <SymbolView
        name={
          left
            ? { ios: "chevron.left", android: "chevron_left", web: "chevron_left" }
            : { ios: "chevron.right", android: "chevron_right", web: "chevron_right" }
        }
        size={20}
        tintColor={colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.md, gap: spacing.md },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  range: { fontVariant: ["tabular-nums"] },
  notice: { paddingHorizontal: spacing.lg },
  status: { padding: spacing.xl, gap: spacing.lg, alignItems: "center" },
});
