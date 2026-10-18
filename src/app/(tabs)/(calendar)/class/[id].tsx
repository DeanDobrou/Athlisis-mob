import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { TypeNames } from "@/components/type-names";
import { useAction } from "@/lib/action";
import { useClock } from "@/lib/clock";
import type { MemberClass } from "@/lib/contract";
import { minutesUntil, shortDate, timeBefore, weekdayName } from "@/lib/dates";
import { bookClass, cancelClass, checkInClass, useSchedule } from "@/lib/schedule";
import { radius, spacing, typography, useColors } from "@/lib/theme";
import {
  CANCEL_CUTOFF_MINUTES,
  CHECK_IN_OPENS_MINUTES,
  classStatus,
  SHOW_CHECK_IN,
} from "@/lib/training";

export default function ClassSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classes } = useSchedule();
  const { pending, error, setError, notice, setNotice, run } = useAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  // Check-in, the cancel cutoff and the start are read off this clock below.
  const now = useClock();

  const sheet = [styles.sheet, { paddingBottom: insets.bottom + spacing.lg }];
  const muted = [typography.body, { color: colors.textMuted }];
  const item = classes?.find((c) => c.id === id);

  if (!classes || !item) {
    return (
      <View style={sheet}>
        <Text style={muted}>Το μάθημα δεν βρέθηκε.</Text>
      </View>
    );
  }

  const status = classStatus(item, classes, now);
  const booking = "booking" in status ? status.booking : null;
  const places =
    status.kind === "cancelled"
      ? "Το μάθημα ακυρώθηκε."
      : status.kind === "ended"
        ? "Το μάθημα ολοκληρώθηκε."
        : status.left === 0
          ? "Το μάθημα είναι γεμάτο."
          : `${status.left} ${status.left === 1 ? "ελεύθερη θέση" : "ελεύθερες θέσεις"} από ${item.capacity}`;
  const rules =
    status.kind !== "cancelled" && status.kind !== "ended" && status.minutes > CANCEL_CUTOFF_MINUTES
      ? `Ακύρωση έως τις ${timeBefore(item.start_time, CANCEL_CUTOFF_MINUTES)}` +
        (SHOW_CHECK_IN
          ? ` · check-in από τις ${timeBefore(item.start_time, CHECK_IN_OPENS_MINUTES)}`
          : "")
      : null;

  const book = (confirmUnpaid: boolean) => {
    void run(async () => {
      const asked = await bookClass(item.id, confirmUnpaid);
      if (asked) setConfirm(asked.confirm);
      else router.back();
    });
  };

  const cancel = (bookingId: string) => {
    void run(async () => {
      const owed = await cancelClass(item.id, bookingId);
      if (owed) {
        setNotice(owed);
        setAsking(false);
      } else {
        router.back();
      }
    });
  };

  /** The free class that day nearest in time to this full one, if any. */
  const nearestFree = (): MemberClass | undefined => {
    const distance = (c: MemberClass) =>
      Math.abs(minutesUntil(c.day, c.start_time, now) - status.minutes);
    return classes
      .filter((c) => c.day === item.day && classStatus(c, classes, now).kind === "open")
      .sort((a, b) => distance(a) - distance(b))[0];
  };

  const action = (): ReactNode => {
    const tooLate = (
      <Text style={muted}>
        Η ακύρωση κλείνει μία ώρα πριν από το μάθημα.
        {SHOW_CHECK_IN && ` Το check-in ανοίγει ${CHECK_IN_OPENS_MINUTES} λεπτά πριν.`}
      </Text>
    );
    switch (status.kind) {
      case "checkIn": {
        // With check-in hidden, its window is only too late to cancel.
        if (!SHOW_CHECK_IN) return tooLate;
        const bookingId = status.booking.id;
        return (
          <Button
            label="Κάνε check-in"
            onPress={() => void run(() => checkInClass(item.id, bookingId))}
            pending={pending}
          />
        );
      }
      case "cancelClosed":
        return tooLate;
      case "booked":
        return (
          <Button
            label="Ακύρωση κράτησης"
            tone="dangerOutline"
            onPress={() => {
              setError(null);
              setAsking(true);
            }}
          />
        );
      case "started":
        return <Text style={muted}>Το μάθημα έχει ξεκινήσει.</Text>;
      case "bookedThatDay":
        return <Text style={muted}>Έχεις ήδη κλείσει θέση αυτή την ημέρα.</Text>;
      case "open":
        return confirm ? (
          <>
            <Text style={[typography.body, { color: colors.text }]}>{confirm}</Text>
            <Button label="Κλείσε θέση" onPress={() => book(true)} pending={pending} />
            <Button label="Άκυρο" tone="plain" onPress={() => setConfirm(null)} disabled={pending} />
          </>
        ) : (
          <Button label="Κλείσε θέση" onPress={() => book(false)} pending={pending} />
        );
      case "full": {
        const nearest = nearestFree();
        if (!nearest) return null;
        const free = nearest.capacity - nearest.booked;
        return (
          <View style={styles.alternative}>
            <Text style={[typography.footnote, styles.bold, { color: colors.textMuted }]}>
              Ελεύθερο την ίδια μέρα
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.setParams({ id: nearest.id })}
              style={({ pressed }) => [
                styles.option,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[typography.headline, { color: colors.text }]}>
                {nearest.start_time} · {free} {free === 1 ? "θέση" : "θέσεις"}
              </Text>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
                size={16}
                tintColor={colors.textMuted}
              />
            </Pressable>
          </View>
        );
      }
      default:
        // Cancelled, over, or already checked in: nothing left to do.
        return null;
    }
  };

  if (booking && asking) {
    return (
      <ConfirmSheet
        icon={{ ios: "calendar.badge.minus", android: "event_busy", web: "event_busy" }}
        title="Ακύρωση κράτησης"
        message="Θέλεις σίγουρα να ακυρώσεις τη θέση σου;"
        detail={`${weekdayName(item.day)} ${shortDate(item.day)} · ${item.start_time} - ${item.end_time}`}
        confirmLabel="Ναι"
        cancelLabel="Όχι"
        onConfirm={() => cancel(booking.id)}
        onCancel={() => {
          setError(null);
          setAsking(false);
        }}
        pending={pending}
        error={error}
      />
    );
  }

  return (
    <View style={sheet}>
      <View style={styles.heading}>
        <Text style={[typography.title, { color: colors.text }]}>
          {weekdayName(item.day)} {shortDate(item.day)}
        </Text>
        <Text style={muted}>
          {item.start_time} - {item.end_time}
        </Text>
      </View>

      <TypeNames types={item.types} style={[typography.headline, { color: colors.text }]} />
      {error ? (
        <Text
          selectable
          accessibilityRole="alert"
          style={[typography.body, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : (
        <Text style={muted}>{places}</Text>
      )}
      {rules && <Text style={[typography.footnote, { color: colors.textMuted }]}>{rules}</Text>}

      {booking && (
        <Text style={[typography.headline, { color: colors.primary }]}>
          ✓{" "}
          {SHOW_CHECK_IN && booking.status === "checked_in"
            ? "Έκανες check-in."
            : status.kind === "ended"
              ? "Είχες κλείσει θέση."
              : "Έχεις κλείσει θέση."}
        </Text>
      )}
      {notice && <Text style={muted}>{notice}</Text>}

      {action()}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: spacing.xl, gap: spacing.md },
  heading: { gap: spacing.xs, marginBottom: spacing.xs },
  bold: { fontWeight: "600" },
  alternative: { gap: spacing.sm },
  option: {
    height: 50,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
