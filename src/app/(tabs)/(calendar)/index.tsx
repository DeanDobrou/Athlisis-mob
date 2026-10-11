import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  cubicBezier,
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  LayoutAnimationConfig,
} from "react-native-reanimated";

import { Button } from "@/components/button";
import { DayClasses, MonthGrid } from "@/components/month-view";
import { NextTraining } from "@/components/next-training";
import { Segmented } from "@/components/segmented";
import { useTabBarSpace } from "@/components/tab-bar";
import { WeekLegend, WeekTimetable } from "@/components/week-timetable";
import {
  addDays,
  addMonths,
  firstTrainingDay,
  monthName,
  monthStart,
  today,
  weekStart,
  weekTitle,
} from "@/lib/dates";
import {
  loadSchedule,
  refreshSchedule,
  useSchedule,
  type MemberClass,
} from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";

type Mode = "week" | "month";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const RESIZE = cubicBezier(0.23, 1, 0.32, 1);
const NO_CLASSES: MemberClass[] = [];

const MODES = {
  week: {
    pageOf: weekStart,
    next: (week: string) => addDays(week, 7),
    title: weekTitle,
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
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  // The pages fill the calendar card: the screen less its margins and border.
  const pageWidth = width - (spacing.lg + 1) * 2;
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
  // Each week's classes as one stable array, so an unchanged week skips rendering.
  const byWeek = useMemo(() => {
    const map = new Map<string, MemberClass[]>();
    for (const c of classes ?? []) {
      const week = weekStart(c.day);
      const list = map.get(week);
      if (list) list.push(c);
      else map.set(week, [c]);
    }
    return map;
  }, [classes]);
  const focused = focus ?? start;
  const openingIndex = pages.indexOf(opening);
  const found = pages.indexOf(pageOf(focused));
  const current = found === -1 ? openingIndex : found;
  const page = pages[current];
  const [moved, setMoved] = useState({ page, forward: true });
  if (moved.page !== page) setMoved({ page, forward: page > moved.page });
  const [heights, setHeights] = useState<Record<string, number>>({});
  const measure = useCallback((key: string, height: number) => {
    setHeights((all) => (all[key] === height ? all : { ...all, [key]: height }));
  }, []);

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

  const open = useCallback(
    (id: string) => router.push({ pathname: "/class/[id]", params: { id } }),
    [router],
  );

  async function pull() {
    setPulling(true);
    await refreshSchedule();
    setPulling(false);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
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

      {classes && <NextTraining classes={classes} onOpen={open} />}

      {/* One card holds the calendar: its range and arrows above the pages that swipe inside it. */}
      <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.bar}>
          <LayoutAnimationConfig skipEntering>
            {/* The new range slides in from the side it came from while the old one fades out. */}
            <Animated.Text
              key={page}
              entering={(moved.forward ? FadeInRight : FadeInLeft)
                .duration(320)
                .easing(EASE_OUT)
                .withInitialValues({ transform: [{ translateX: moved.forward ? 48 : -48 }] })}
              exiting={FadeOut.duration(140)}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[typography.title, styles.range, { color: colors.text }]}
            >
              {title(page)}
            </Animated.Text>
          </LayoutAnimationConfig>
          {current !== openingIndex && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Σήμερα"
                onPress={() => goTo(openingIndex)}
                style={({ pressed }) => [styles.today, { opacity: pressed ? 0.5 : 1 }]}
              >
                <SymbolView
                  name={
                    current < openingIndex
                      ? { ios: "arrow.uturn.forward", android: "redo", web: "redo" }
                      : { ios: "arrow.uturn.backward", android: "undo", web: "undo" }
                  }
                  size={20}
                  tintColor={colors.text}
                />
              </Pressable>
            </Animated.View>
          )}
          <PageArrow
            direction="left"
            label={previous}
            disabled={current === 0}
            onPress={() => goTo(current - 1)}
          />
          <PageArrow
            direction="right"
            label={following}
            disabled={current === pages.length - 1}
            onPress={() => goTo(current + 1)}
          />
        </View>

        {/* An inset hairline that fades out at both ends. */}
        <View
          style={[
            styles.rule,
            {
              experimental_backgroundImage: `linear-gradient(90deg, transparent, ${colors.border} 20%, ${colors.border} 80%, transparent)`,
            },
          ]}
        />

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
              entering={(mode === "month" ? FadeInRight : FadeInLeft).duration(200).easing(EASE_OUT)}
            >
              <Animated.View
                style={{
                  height: heights[`${mode}:${page}`],
                  overflow: "hidden",
                  transitionProperty: "height",
                  transitionDuration: 250,
                  transitionTimingFunction: RESIZE,
                }}
              >
                <FlatList
                  key={`${mode}:${pages[0]}:${pages.length}`}
                  ref={list}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pages}
                  data={pages}
                  keyExtractor={(item) => item}
                  initialScrollIndex={current}
                  initialNumToRender={1}
                  maxToRenderPerBatch={1}
                  windowSize={3}
                  getItemLayout={(_, index) => ({
                    length: pageWidth,
                    offset: pageWidth * index,
                    index,
                  })}
                  onMomentumScrollEnd={(e) => {
                    const target = pages[Math.round(e.nativeEvent.contentOffset.x / pageWidth)];
                    if (target !== page) setFocus(focusFor(target));
                  }}
                  renderItem={({ item }) => (
                    <View onLayout={(e) => measure(`${mode}:${item}`, e.nativeEvent.layout.height)}>
                      {mode === "week" ? (
                        <WeekTimetable
                          week={item}
                          classes={byWeek.get(item) ?? NO_CLASSES}
                          width={pageWidth}
                          today={day}
                          onOpen={open}
                        />
                      ) : (
                        <MonthGrid
                          month={item}
                          byDay={byDay}
                          width={pageWidth}
                          today={day}
                          selected={focused}
                          onSelect={setFocus}
                        />
                      )}
                    </View>
                  )}
                />
              </Animated.View>
            </Animated.View>
          </LayoutAnimationConfig>
        )}
      </View>

      {classes && (
        <LayoutAnimationConfig skipEntering>
          <Animated.View key={mode} entering={FadeIn.duration(200).easing(EASE_OUT)}>
            {mode === "week" ? (
              <WeekLegend classes={byWeek.get(page) ?? NO_CLASSES} />
            ) : (
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
      onPress={onPress}
      style={[
        styles.arrow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      <SymbolView
        name={
          left
            ? { ios: "chevron.left", android: "chevron_left", web: "chevron_left" }
            : { ios: "chevron.right", android: "chevron_right", web: "chevron_right" }
        }
        size={18}
        tintColor={colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.md, gap: spacing.md },
  modes: { paddingHorizontal: spacing.lg },
  calendar: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: 20,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: spacing.md,
  },
  rule: { height: 1, marginHorizontal: 14, marginBottom: spacing.sm },
  pages: { alignItems: "flex-start" },
  range: { flex: 1, fontVariant: ["tabular-nums"] },
  today: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  status: { padding: spacing.xl, gap: spacing.lg, alignItems: "center" },
});
