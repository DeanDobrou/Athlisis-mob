import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { TypeNames } from "@/components/type-names";
import { errorMessage } from "@/lib/api";
import {
  addDays,
  minutesUntil,
  shortDate,
  timeBefore,
  today,
  weekdayName,
  weekdayShort,
} from "@/lib/dates";
import { checkInClass, type MemberClass } from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";
import { CANCEL_CUTOFF_MINUTES, CHECK_IN_OPENS_MINUTES, nextTraining } from "@/lib/training";

/** Σήμερα, Αύριο, or the weekday and date further ahead. */
function dayWord(day: string): string {
  const now = today();
  if (day === now) return "Σήμερα";
  if (day === addDays(now, 1)) return "Αύριο";
  return `${weekdayName(day)} ${shortDate(day)}`;
}

/**
 * The top of the schedule: the member's next class, or its check-in once it
 * opens. Nothing at all when no class is booked.
 */
export function NextTraining({
  classes,
  onOpen,
}: {
  classes: MemberClass[];
  onOpen: (classId: string) => void;
}) {
  const colors = useColors();
  const [pending, setPending] = useState(false);
  const [, setTick] = useState(0);

  // Re-reads the clock every 30 s so check-in opens on time.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const next = nextTraining(classes);
  if (!next) return null;

  const { item } = next;
  const word = dayWord(item.day);
  const title = `${word}, ${item.start_time}`;
  const onInk = { color: colors.onPrimary };

  async function checkIn(bookingId: string) {
    setPending(true);
    try {
      await checkInClass(item.id, bookingId);
    } catch (e) {
      Alert.alert("Το check-in δεν έγινε", errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  if (next.kind === "checkedIn") {
    return (
      <View style={[styles.card, { backgroundColor: colors.primary }]}>
        <View style={[styles.badge, { backgroundColor: colors.onPrimary }]}>
          <SymbolView
            name={{ ios: "checkmark", android: "check", web: "check" }}
            size={20}
            tintColor={colors.primary}
          />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, onInk]}>Έκανες check-in</Text>
          <Text style={[typography.footnote, styles.soft, styles.nums, onInk]}>
            Καλή προπόνηση · {item.start_time} - {item.end_time}
          </Text>
        </View>
      </View>
    );
  }

  if (next.kind === "checkIn") {
    const minutes = Math.ceil(next.minutes);
    const bookingId = item.my_booking!.id;
    return (
      <View style={[styles.card, { backgroundColor: colors.primary }]}>
        <View style={styles.body}>
          <Text style={[styles.eyebrow, styles.soft, onInk]}>
            {minutes > 0 ? `ΞΕΚΙΝΑ ΣΕ ${minutes} ${minutes === 1 ? "ΛΕΠΤΟ" : "ΛΕΠΤΑ"}` : "ΞΕΚΙΝΗΣΕ"}
          </Text>
          <Text style={[styles.title, onInk]}>{title}</Text>
          <TypeNames types={item.types} style={[typography.footnote, styles.soft, onInk]} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: pending }}
          disabled={pending}
          onPress={() => void checkIn(bookingId)}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: colors.onPrimary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {pending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[typography.subhead, styles.bold, { color: colors.primary }]}>
              Κάνε check-in
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  const midSentence = word === "Σήμερα" || word === "Αύριο" ? word.toLowerCase() : word;
  const note =
    minutesUntil(item.day, item.start_time) > CANCEL_CUTOFF_MINUTES
      ? `Ακύρωση έως ${midSentence} στις ${timeBefore(item.start_time, CANCEL_CUTOFF_MINUTES)}`
      : `Check-in από τις ${timeBefore(item.start_time, CHECK_IN_OPENS_MINUTES)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Επόμενη προπόνηση: ${title}, ${note}`}
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => [
        styles.card,
        styles.outlined,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.tile, { backgroundColor: colors.primary }]}>
        <Text style={[styles.eyebrow, onInk]}>{weekdayShort(item.day).toUpperCase()}</Text>
        <Text style={[styles.tileDate, onInk]}>{Number(item.day.slice(8))}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>ΕΠΟΜΕΝΗ ΠΡΟΠΟΝΗΣΗ</Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <TypeNames types={item.types} style={[typography.footnote, { color: colors.textMuted }]} />
        <Text style={[typography.footnote, { color: colors.textMuted }]}>{note}</Text>
      </View>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
        size={16}
        tintColor={colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
    borderRadius: 20,
    borderCurve: "continuous",
  },
  outlined: { borderWidth: 1 },
  tile: {
    width: 54,
    height: 64,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tileDate: { fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"] },
  body: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  title: { fontSize: 19, fontWeight: "700", fontVariant: ["tabular-nums"] },
  soft: { opacity: 0.75 },
  bold: { fontWeight: "700" },
  nums: { fontVariant: ["tabular-nums"] },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
