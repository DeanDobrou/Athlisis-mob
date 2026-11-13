import { SymbolView } from "expo-symbols";
import {
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cubicBezier,
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { TypeNames } from "@/components/type-names";
import type { MemberClass } from "@/lib/contract";
import { dayMonth, weekdayName, WEEKDAYS } from "@/lib/dates";
import { typography, useColors } from "@/lib/theme";
import {
  classLook,
  classStatus,
  dayFold,
  FEW_PLACES,
  hasBooking,
  type ClassLook,
} from "@/lib/training";

/** Inside the calendar card, as the month grid's padding. */
const PAD = 10;
/**
 * One curve and length for every move here: the push between days, the card's height and the rows
 * the fold shifts. Sharing them keeps the card in step with what it holds.
 */
const EASE = [0.32, 0.72, 0, 1] as const;
export const EASING = Easing.bezier(...EASE);
/** A tap on a day or an arrow lands in one push this long, rather than scrolling past every day between. */
const PUSH = { duration: 250, easing: EASING };
export const RESIZE = cubicBezier(...EASE);
const SHIFT = LinearTransition.duration(250).easing(EASING);
const REVEAL = FadeIn.duration(250).easing(EASING);
const CONCEAL = FadeOut.duration(150);
const CHECK = { ios: "checkmark", android: "check", web: "check" } as const;
/** A changed status settles in from slightly smaller, never from nothing. */
const SETTLE = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.bezier(0.23, 1, 0.32, 1) },
}).duration(260);

/** Days in a training week, Monday to Friday. */
const WEEK = WEEKDAYS.length;

function weekOf(index: number) {
  "worklet";
  return Math.floor(index / WEEK);
}

/**
 * The week as a strip of five days over one day's classes. Swiping moves a
 * day at a time with the strip following the finger; a tap on a day, or the
 * parent moving `selected` (the week arrows, today), lands in one push.
 */
export function WeekDays({
  days,
  selected,
  onSelect,
  byDay,
  today,
  now,
  width,
  activeId,
  onOpen,
}: {
  /** Monday to Friday of every week that can be shown, in order. */
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
  byDay: Map<string, MemberClass[]>;
  today: string;
  now: Date;
  /** In whole pixels: the list pages by it. */
  width: number;
  /** The class whose sheet is open, kept marked behind it. */
  activeId: string | null;
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const list = useRef<FlatList<string>>(null);
  const index = Math.max(0, days.indexOf(selected));
  const last = days.length - 1;
  const stripWidth = width - PAD * 2;
  const cell = stripWidth / WEEK;
  const weeks = days.length / WEEK;
  const listKey = `${days[0]}:${days.length}`;

  // The day the pages are on, ahead of `selected` while a swipe reports back.
  const shown = useRef(index);
  const dayPos = useSharedValue(index);
  const weekPos = useSharedValue(weekOf(index));
  const fromX = useSharedValue(0);
  const toX = useSharedValue(0);
  const [push, setPush] = useState<{ from: string; to: string; dir: number; at: number } | null>(
    null,
  );
  // The day on screen, which lags `shown` until a push gets going, and whether one is moving.
  const visible = useRef(days[index]);
  const moving = useRef(false);
  // From a tap to the end of its push the list is out of sight, and what is left of a swipe's
  // momentum must not pick a day or move the strip. Kept twice, one for each thread.
  const pushing = useRef(false);
  const held = useSharedValue(false);
  // The day the card is sized for: it changes as the push starts, never before.
  const [cardDay, setCardDay] = useState(days[index]);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const measure = useCallback((day: string, height: number) => {
    setHeights((all) => (all[day] === height ? all : { ...all, [day]: height }));
  }, []);
  // Held here, not in each page, so the push's copies of a day fold and measure as the list's does.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = useCallback((day: string) => {
    setExpanded((all) => ({ ...all, [day]: !all[day] }));
  }, []);
  const lastToday = useRef(today);
  // The days the list has drawn, and the one the push waits for before it lifts.
  const drawn = useRef(new Set<string>());
  const waitingFor = useRef<string | null>(null);
  const listed = useCallback((day: string, mounted: boolean) => {
    if (mounted) drawn.current.add(day);
    else drawn.current.delete(day);
    if (mounted && day === waitingFor.current) {
      waitingFor.current = null;
      setPush(null);
    }
  }, []);
  // A day not measured yet keeps the card at its last height, rather than snapping to the list's.
  const target = heights[cardDay];
  const [lastHeight, setLastHeight] = useState(target);
  if (target !== undefined && target !== lastHeight) setLastHeight(target);

  function settle(x: number) {
    const i = Math.round(x / width);
    if (pushing.current || i === shown.current || !days[i]) return;
    shown.current = i;
    onSelect(days[i]);
  }

  const onScroll = useAnimatedScrollHandler((e) => {
    if (held.get()) return;
    const pos = Math.min(Math.max(e.contentOffset.x / width, 0), last);
    const week = weekOf(pos);
    dayPos.set(pos);
    // Between Friday and Monday the strip slides on to the next week with the finger.
    weekPos.set(week + Math.max(0, pos - week * WEEK - (WEEK - 1)));
    // Resting on a page picks its day; the web never reports the end of momentum.
    if (Math.abs(e.contentOffset.x - Math.round(pos) * width) < 0.5) {
      scheduleOnRN(settle, e.contentOffset.x);
    }
  });

  /** Puts the selection, the day on screen and the strip on day `i` at once, without a push. */
  function jump(i: number) {
    shown.current = i;
    visible.current = days[i];
    dayPos.set(i);
    weekPos.set(weekOf(i));
  }

  // A new set of weeks remounts the list on the selected day. A layout effect, to run before the next.
  const onListReplaced = useEffectEvent(() => jump(index));
  useLayoutEffect(() => onListReplaced(), [listKey]);

  // A layout effect, so the push's copies are drawn in the same frame as the new selection.
  const onSelected = useEffectEvent(() => {
    // A new day (midnight, or the app back on a new one) moves the selection untouched: no push.
    const rolledOver = lastToday.current !== today;
    lastToday.current = today;
    if (index === shown.current) {
      // A swipe has already brought the list here: the card follows it.
      if (!moving.current) {
        visible.current = days[index];
        setCardDay(days[index]);
      }
      return;
    }
    if (reduceMotion || rolledOver) {
      jump(index);
      list.current?.scrollToOffset({ offset: index * width, animated: false });
      setCardDay(days[index]);
      return;
    }
    shown.current = index;
    waitingFor.current = null;
    pushing.current = true;
    held.set(true);
    // Between pushes the list is what shows, and a swipe may have left it on a day not yet selected.
    const from = (!moving.current && days[Math.round(dayPos.get())]) || visible.current;
    const dir = index > days.indexOf(from) ? 1 : -1;
    // Placed before the copies mount, so their first frame isn't where the last push left them.
    // A second tap mid-push carries on from where the arriving day is now.
    fromX.set(moving.current ? toX.get() : 0);
    toX.set(dir * width);
    setPush({ from, to: days[index], dir, at: index });
  });
  useLayoutEffect(() => onSelected(), [index, today]);

  // An effect event, so a push that ends after the weeks changed reads the new ones.
  const finish = useEffectEvent(() => {
    moving.current = false;
    pushing.current = false;
    held.set(false);
    // Where the push was sent may be a stale place by now: the strip ends on the day itself.
    jump(shown.current);
    const day = days[shown.current];
    list.current?.scrollToOffset({ offset: shown.current * width, animated: false });
    // The list draws a far day only after scrolling to it: until then the push's copy stays on top.
    if (drawn.current.has(day)) setPush(null);
    else waitingFor.current = day;
  });

  // Between pushes the copies wait where the next one starts: the old day in view, the new one off to
  // the side. On a phone they mount with the values already on the UI thread, before any set in the
  // same frame lands, so these must be right beforehand; the side is corrected while it's unseen.
  useLayoutEffect(() => {
    if (push) return;
    fromX.set(0);
    toX.set(width);
  }, [push, width, fromX, toX]);

  // The old day leaves as the new one arrives, over a list that catches up at the end. It starts a
  // frame later, once the copies are on screen: drawing them can take a moment on a phone, and
  // the strip, the days and the card's height must not set off before there is anything to see.
  const startPush = useEffectEvent((started: NonNullable<typeof push>) => {
    moving.current = true;
    visible.current = started.to;
    setCardDay(started.to);
    dayPos.set(withTiming(started.at, PUSH));
    weekPos.set(withTiming(weekOf(started.at), PUSH));
    fromX.set(withTiming(-started.dir * width, PUSH));
    toX.set(
      withTiming(0, PUSH, (done) => {
        if (done) scheduleOnRN(finish);
      }),
    );
  });
  useLayoutEffect(() => {
    if (!push) return;
    const frame = requestAnimationFrame(() => startPush(push));
    return () => cancelAnimationFrame(frame);
  }, [push]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: dayPos.get() * cell }] }));
  const track = useAnimatedStyle(() => ({
    transform: [{ translateX: -weekPos.get() * stripWidth }],
  }));
  const leaving = useAnimatedStyle(() => ({ transform: [{ translateX: fromX.get() }] }));
  const arriving = useAnimatedStyle(() => ({ transform: [{ translateX: toX.get() }] }));

  // The strip draws only the weeks it can show: the selected one, its neighbours for a swipe over
  // a weekend, and those around the day on screen and the day a push leaves, so a far jump keeps
  // the week it starts from. Only the selected week is read out.
  const onWeek = weekOf(index);
  const near = [index, days.indexOf(cardDay), push ? days.indexOf(push.from) : index].map(weekOf);
  const stripWeeks = [...new Set(near.flatMap((w) => [w - 1, w, w + 1]))]
    .filter((w) => w >= 0 && w < weeks)
    .sort((a, b) => a - b);

  // Keyed, so a push retargeted on the way draws its new day whole instead of fading rows over.
  const page = (day: string, inList = false) => (
    <DayPage
      key={day}
      onListed={inList ? listed : undefined}
      day={day}
      classes={byDay.get(day)}
      today={today}
      now={now}
      width={width}
      activeId={activeId}
      onOpen={onOpen}
      onHeight={measure}
      showDone={!!expanded[day]}
      onToggle={toggle}
    />
  );

  return (
    <View>
      <View style={[styles.strip, { width: stripWidth }]}>
        <Animated.View style={[{ flexDirection: "row", width: stripWidth * weeks }, track]}>
          <Animated.View
            style={[styles.indicator, { width: cell, backgroundColor: colors.accent }, indicator]}
          />
          {stripWeeks.map((w, n) => (
            <View
              key={w}
              accessibilityElementsHidden={w !== onWeek}
              importantForAccessibility={w === onWeek ? "auto" : "no-hide-descendants"}
              style={{
                flexDirection: "row",
                // Each week sits at its own place on the track, whichever others are drawn.
                marginLeft: (w - (stripWeeks[n - 1] ?? -1) - 1) * stripWidth,
              }}
            >
              {days.slice(w * WEEK, (w + 1) * WEEK).map((day, i) => (
                <StripDay
                  key={day}
                  day={day}
                  label={WEEKDAYS[i]}
                  selected={day === selected}
                  isToday={day === today}
                  past={day < today}
                  booked={hasBooking(byDay.get(day) ?? [])}
                  width={cell}
                  onSelect={onSelect}
                />
              ))}
            </View>
          ))}
        </Animated.View>
      </View>

      {/* As the month card does, the card follows the height of the day on show. */}
      <Animated.View
        style={{
          height: lastHeight,
          overflow: "hidden",
          transitionProperty: "height",
          transitionDuration: reduceMotion ? 0 : 250,
          transitionTimingFunction: RESIZE,
        }}
      >
        <Animated.FlatList
          key={listKey}
          ref={list}
          style={{ width }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pages}
          data={days}
          keyExtractor={(day) => day}
          initialScrollIndex={index}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => page(item, true)}
        />
        {push && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]}>
            <Animated.View style={[styles.layer, leaving]}>{page(push.from)}</Animated.View>
            <Animated.View style={[styles.layer, arriving]}>{page(push.to)}</Animated.View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * One day in the strip. Memoised with plain props, so a new selection redraws the two days it
 * moves between rather than every week the strip has drawn.
 */
const StripDay = memo(function StripDay({
  day,
  label,
  selected,
  isToday,
  past,
  booked,
  width,
  onSelect,
}: {
  day: string;
  label: string;
  selected: boolean;
  isToday: boolean;
  past: boolean;
  /** The member holds a place that day: a dot under the number, as in the month grid. */
  booked: boolean;
  width: number;
  onSelect: (day: string) => void;
}) {
  const colors = useColors();
  const ink = isToday ? colors.onPrimary : past ? colors.textMuted : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        `${weekdayName(day)} ${dayMonth(day)}` + (booked ? ", έχεις κλείσει θέση" : "")
      }
      accessibilityState={{ selected }}
      onPress={() => onSelect(day)}
      style={[styles.day, { width }]}
    >
      <Text style={[styles.weekday, { color: isToday ? colors.text : colors.textMuted }]}>
        {label}
      </Text>
      <View style={[styles.date, isToday && { backgroundColor: colors.primary }]}>
        <Text style={[styles.dateText, { color: ink }]}>{Number(day.slice(8))}</Text>
        {booked && <View style={[styles.bookedDot, { backgroundColor: ink }]} />}
      </View>
    </Pressable>
  );
});

/** One day: its heading, then its classes, with the finished ones folded away. */
export const DayPage = memo(function DayPage({
  day,
  classes = [],
  today,
  now,
  width,
  activeId,
  onOpen,
  onHeight,
  showDone,
  onToggle,
  onListed,
}: {
  day: string;
  classes?: MemberClass[];
  today: string;
  now: Date;
  width: number;
  activeId: string | null;
  onOpen: (classId: string) => void;
  onHeight: (day: string, height: number) => void;
  showDone: boolean;
  onToggle: (day: string) => void;
  /** Given to the list's pages only, which report when they are drawn and dropped. */
  onListed?: (day: string, mounted: boolean) => void;
}) {
  const colors = useColors();
  useEffect(() => {
    if (!onListed) return;
    onListed(day, true);
    return () => onListed(day, false);
  }, [day, onListed]);
  const rows = [...classes]
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((item) => {
      const status = classStatus(item, classes, now);
      return { item, status, ...classLook(status) };
    });
  const { hidden, count, booked: wasBooked } = dayFold(rows.map((r) => r.status));
  const label = count === 1 ? "1 μάθημα ολοκληρώθηκε" : `${count} μαθήματα ολοκληρώθηκαν`;
  // Read straight after each render, so the card resizes in the frame the rows start to move,
  // not a frame or two later when onLayout reports.
  const pageRef = useRef<View>(null);
  useLayoutEffect(() => {
    pageRef.current?.measure((_x, _y, _width, height) => onHeight(day, height));
  });

  return (
    <View
      ref={pageRef}
      style={[styles.page, { width }]}
      onLayout={(e) => onHeight(day, e.nativeEvent.layout.height)}
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        {day === today ? "Σήμερα · " : ""}
        {weekdayName(day)} {dayMonth(day)}
      </Text>
      {rows.length === 0 ? (
        <Text style={[typography.body, styles.empty, { color: colors.textMuted }]}>
          Δεν υπάρχουν μαθήματα αυτή τη μέρα.
        </Text>
      ) : (
        // Rows animate only when the fold opens or closes, not as a page is drawn or dropped.
        <LayoutAnimationConfig skipEntering skipExiting>
          <View style={styles.rows}>
            {hidden > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={wasBooked ? `${label}, είχες κλείσει θέση` : label}
                accessibilityState={{ expanded: showDone }}
                onPress={() => onToggle(day)}
                style={({ pressed }) => [styles.fold, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[typography.footnote, styles.bold, { color: colors.textMuted }]}>
                  {label}
                </Text>
                <View style={styles.foldEnd}>
                  {/* The member trained that day: the same check as their class's row, until it shows. */}
                  {wasBooked && !showDone && (
                    <LayoutAnimationConfig skipEntering>
                      <Capsule look="attended" />
                    </LayoutAnimationConfig>
                  )}
                  <SymbolView
                    name={
                      showDone
                        ? { ios: "chevron.up", android: "expand_less", web: "expand_less" }
                        : { ios: "chevron.down", android: "expand_more", web: "expand_more" }
                    }
                    size={14}
                    tintColor={colors.textMuted}
                  />
                </View>
              </Pressable>
            )}
            {rows.map(({ item, status, look, text }, i) =>
              i < hidden && !showDone ? null : (
                <Animated.View
                  key={item.id}
                  entering={REVEAL}
                  // A push's copy fades nothing out: skipExiting doesn't hold as the copy is dropped,
                  // and on Android a row fading over the list's own dims it for a moment.
                  exiting={onListed ? CONCEAL : undefined}
                  layout={SHIFT}
                >
                  <ClassRow
                    item={item}
                    look={look}
                    text={text}
                    left={status.left}
                    active={item.id === activeId}
                    onOpen={onOpen}
                  />
                </Animated.View>
              ),
            )}
          </View>
        </LayoutAnimationConfig>
      )}
    </View>
  );
});

function ClassRow({
  item,
  look,
  text,
  left,
  active,
  onOpen,
}: {
  item: MemberClass;
  look: ClassLook;
  text: string;
  left: number;
  active: boolean;
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const past = look === "gone" || look === "attended" || look === "cancelled";
  const ink = look === "booked" ? colors.onPrimary : past ? colors.textMuted : colors.text;
  const names = item.types.map((t) => t.name).join(" και ") || "Μάθημα";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.start_time}, ${names}, ${text}`}
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Animated.View
        style={[
          styles.row,
          {
            backgroundColor:
              look === "booked" ? colors.primary : past ? "transparent" : colors.accent,
            // A booking changes the row's colour in place rather than swapping it.
            transitionProperty: "backgroundColor",
            transitionDuration: reduceMotion ? 0 : 320,
          },
          active && {
            outlineWidth: 2,
            outlineStyle: "solid",
            outlineColor: colors.text,
            outlineOffset: 2,
          },
        ]}
      >
        <Text style={[styles.time, { color: ink }]}>{item.start_time}</Text>
        <View style={styles.names}>
          <TypeNames types={item.types} stacked style={[styles.name, { color: ink }]} />
        </View>
        <LayoutAnimationConfig skipEntering>
          <Capsule key={look} look={look} left={left} text={text} />
        </LayoutAnimationConfig>
      </Animated.View>
    </Pressable>
  );
}

/**
 * The class's whole state in one chip, so the row says it once. An open class shows `text`, the
 * places as `classLook` words them, coloured by `left`.
 */
function Capsule({ look, left = 0, text = "" }: { look: ClassLook; left?: number; text?: string }) {
  const colors = useColors();

  // A finished class says so by fading.
  if (look === "gone") return null;

  if (look === "booked" || look === "attended") {
    // As in the month view's day list, a class of yours shows just a check; the sentence is in the sheet.
    const booked = look === "booked";
    return (
      <Animated.View
        entering={SETTLE}
        style={[
          styles.capsule,
          styles.round,
          { backgroundColor: booked ? `${colors.onPrimary}29` : colors.chip },
        ]}
      >
        <SymbolView
          name={CHECK}
          size={16}
          tintColor={booked ? colors.onPrimary : colors.textMuted}
        />
      </Animated.View>
    );
  }

  const [background, ink] =
    look === "full"
      ? [colors.chip, colors.textMuted]
      : look === "cancelled"
        ? ["transparent", colors.textMuted]
        : left <= FEW_PLACES
          ? [colors.warningSoft, colors.warning]
          : [colors.successSoft, colors.success];

  return (
    <Animated.View
      entering={SETTLE}
      style={[
        styles.capsule,
        { backgroundColor: background },
        look === "cancelled" && { borderWidth: 1, borderStyle: "dashed", borderColor: ink },
      ]}
    >
      {/* The row's spoken words, with a capital to stand alone. */}
      <Text style={[styles.capsuleText, { color: ink }]}>
        {text.charAt(0).toUpperCase() + text.slice(1)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: { marginHorizontal: PAD, marginBottom: PAD, overflow: "hidden", borderRadius: 14 },
  indicator: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 14 },
  day: { alignItems: "center", gap: 3, paddingTop: 8, paddingBottom: 10 },
  weekday: { fontSize: 12, fontWeight: "600" },
  date: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dateText: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  bookedDot: { position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: 2 },
  pages: { alignItems: "flex-start" },
  layer: { position: "absolute", top: 0, left: 0 },
  page: { paddingHorizontal: PAD, paddingBottom: PAD },
  heading: { fontSize: 15, fontWeight: "600", paddingHorizontal: 6, paddingTop: 2, paddingBottom: 10 },
  empty: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 12 },
  rows: { gap: 6 },
  fold: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  foldEnd: { flexDirection: "row", alignItems: "center", gap: 10 },
  bold: { fontWeight: "600" },
  row: {
    minHeight: 60,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderCurve: "continuous",
  },
  time: { width: 52, fontSize: 17, fontWeight: "700", fontVariant: ["tabular-nums"] },
  names: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600" },
  capsule: {
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  round: { width: 28, paddingHorizontal: 0 },
  capsuleText: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
