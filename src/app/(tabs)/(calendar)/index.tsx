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
import Animated, {
  Easing,
  FadeInLeft,
  FadeInRight,
  LayoutAnimationConfig,
} from "react-native-reanimated";

import { Button } from "@/components/button";
import { DayClasses, MonthGrid } from "@/components/month-view";
import { Segmented } from "@/components/segmented";
import { WeekTimetable } from "@/components/week-timetable";
import {
  addDays,
  addMonths,
  firstTrainingDay,
  monthName,
  monthStart,
  shortDate,
  today,
  weekStart,
} from "@/lib/dates";
import {
  loadSchedule,
  refreshSchedule,
  useSchedule,
  type MemberClass,
} from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";

type Mode = "week" | "month";

const MODES = {
  week: {
    pageOf: weekStart,
    next: (week: string) => addDays(week, 7),
    title: (week: string) => `${shortDate(week)} - ${shortDate(addDays(week, 4))}`,
    previous: "Προηγούμενη εβδομάδα",
    following: "Επόμενη εβδομάδα",
  },
  month: {
    pageOf: monthStart,
    next: (month: string) => addMonths(month, 1),
    title: monthName,
    previous: "Προηγούμενος μήνας",
    following: "Επόμενος μήνας",
  },
};

/** The pages to swipe through: the first with classes to the last, and `opening`. */
function pagesAround(opening: string, classes: MemberClass[], mode: Mode): string[] {
  const { pageOf, next } = MODES[mode];
  let first = opening;
  let last = opening;
  for (const c of classes) {
    const page = pageOf(c.day);
    if (page < first) first = page;
    if (page > last) last = page;
  }
  const pages = [first];
  while (pages[pages.length - 1] < last) {
    pages.push(next(pages[pages.length - 1]));
  }
  return pages;
}

export default function CalendarScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { classes, refreshing, error } = useSchedule();
  const [mode, setMode] = useState<Mode>("week");
  const [focus, setFocus] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const list = useRef<FlatList<string>>(null);
  const router = useRouter();

  const day = today();
  const start = firstTrainingDay(day);
  const { pageOf, title, previous, following } = MODES[mode];
  const opening = pageOf(start);
  const pages = useMemo(
    () => pagesAround(opening, classes ?? [], mode),
    [opening, classes, mode],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, MemberClass[]>();
    for (const c of classes ?? []) {
      map.set(c.day, [...(map.get(c.day) ?? []), c]);
    }
    return map;
  }, [classes]);
  const focused = focus ?? start;
  const openingIndex = pages.indexOf(opening);
  const found = pages.indexOf(pageOf(focused));
  const current = found === -1 ? openingIndex : found;
  const page = pages[current];

  useEffect(() => {
    void loadSchedule();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void refreshSchedule();
    });
    return () => subscription.remove();
  }, []);

  /** The day a page selects: today on today's page, otherwise its first training day. */
  function focusFor(target: string) {
    return target === opening ? start : firstTrainingDay(target);
  }

  function goTo(index: number) {
    list.current?.scrollToIndex({ index, animated: true });
    setFocus(focusFor(pages[index]));
  }

  function open(id: string) {
    router.push({ pathname: "/class/[id]", params: { id } });
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
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={pull}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.modes}>
        <Segmented
          options={["Εβδομάδα", "Μήνας"]}
          selected={mode === "week" ? 0 : 1}
          onChange={(index) => setMode(index === 0 ? "week" : "month")}
        />
      </View>

      <View style={styles.bar}>
        <PageArrow
          direction="left"
          label={previous}
          disabled={current === 0}
          onPress={() => goTo(current - 1)}
        />
        <Text style={[typography.headline, styles.range, { color: colors.text }]}>
          {title(page)}
        </Text>
        <PageArrow
          direction="right"
          label={following}
          disabled={current === pages.length - 1}
          onPress={() => goTo(current + 1)}
        />
        {focused !== start && (
          <Pressable
            accessibilityRole="button"
            onPress={() => goTo(openingIndex)}
            hitSlop={spacing.md}
          >
            <Text style={[typography.subhead, styles.today, { color: colors.primary }]}>Σήμερα</Text>
          </Pressable>
        )}
      </View>

      {classes === null ? (
        <View style={styles.status}>
          {error ? (
            <>
              <Text selectable style={[typography.body, { color: colors.textMuted }]}>
                {error}
              </Text>
              <Button label="Δοκίμασε ξανά" onPress={() => void refreshSchedule()} pending={refreshing} />
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      ) : (
        <LayoutAnimationConfig skipEntering>
          <Animated.View
            key={mode}
            entering={(mode === "month" ? FadeInRight : FadeInLeft)
              .duration(200)
              .easing(Easing.bezier(0.23, 1, 0.32, 1))}
            style={styles.views}
          >
            <FlatList
              key={`${mode}:${pages[0]}:${pages.length}`}
              ref={list}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={pages}
              keyExtractor={(item) => item}
              initialScrollIndex={current}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={(e) => {
                const target = pages[Math.round(e.nativeEvent.contentOffset.x / width)];
                if (target !== page) setFocus(focusFor(target));
              }}
              renderItem={({ item }) =>
                mode === "week" ? (
                  <WeekTimetable
                    week={item}
                    classes={[0, 1, 2, 3, 4].flatMap((i) => byDay.get(addDays(item, i)) ?? [])}
                    width={width}
                    today={day}
                    onOpen={open}
                  />
                ) : (
                  <MonthGrid
                    month={item}
                    byDay={byDay}
                    width={width}
                    today={day}
                    selected={focused}
                    onSelect={setFocus}
                  />
                )
              }
            />
            {mode === "month" && (
              <DayClasses day={focused} classes={byDay.get(focused) ?? []} onOpen={open} />
            )}
          </Animated.View>
        </LayoutAnimationConfig>
      )}
    </ScrollView>
  );
}

function PageArrow({
  direction,
  label,
  disabled,
  onPress,
}: {
  direction: "left" | "right";
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const left = direction === "left";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.md}
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
        tintColor={colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.md, gap: spacing.md },
  modes: { paddingHorizontal: spacing.lg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  range: { fontVariant: ["tabular-nums"] },
  today: { fontWeight: "600" },
  views: { gap: spacing.md },
  status: { padding: spacing.xl, gap: spacing.lg, alignItems: "center" },
});
