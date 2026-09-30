import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { TypeNames } from "@/components/type-names";
import { errorMessage } from "@/lib/api";
import { minutesUntil, shortDate, weekdayName } from "@/lib/dates";
import { bookClass, cancelClass, checkInClass, useSchedule } from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";

/** Members may cancel until this many minutes before a class, as on the server. */
const CANCEL_CUTOFF_MINUTES = 60;

/** Members may check in from this many minutes before a class until it ends, as on the server. */
const CHECK_IN_OPENS_MINUTES = 10;

export default function ClassSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classes } = useSchedule();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const sheet = [styles.sheet, { paddingBottom: insets.bottom + spacing.lg }];
  const muted = [typography.body, { color: colors.textMuted }];
  const item = classes?.find((c) => c.id === id);

  if (!item) {
    return (
      <View style={sheet}>
        <Text style={muted}>Το μάθημα δεν βρέθηκε.</Text>
      </View>
    );
  }

  const minutes = minutesUntil(item.day, item.start_time);
  const started = minutes <= 0;
  const ending = minutesUntil(item.day, item.end_time);
  const cancelled = item.status === "cancelled";
  const booking = cancelled ? null : item.my_booking;
  const checkedIn = booking?.status === "checked_in";
  const left = Math.max(0, item.capacity - item.booked);
  const places = cancelled
    ? "Το μάθημα ακυρώθηκε."
    : left === 0
      ? "Το μάθημα είναι γεμάτο."
      : `${left} ${left === 1 ? "ελεύθερη θέση" : "ελεύθερες θέσεις"} από ${item.capacity}`;

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    setNote(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  function book(confirmUnpaid: boolean) {
    void run(async () => {
      const asked = await bookClass(item!.id, confirmUnpaid);
      if (asked) setConfirm(asked.confirm);
      else router.back();
    });
  }

  function cancel(bookingId: string) {
    void run(async () => {
      const notice = await cancelClass(item!.id, bookingId);
      if (notice) {
        setNote(notice);
        setAsking(false);
      } else {
        router.back();
      }
    });
  }

  function checkIn(bookingId: string) {
    void run(() => checkInClass(item!.id, bookingId));
  }

  let action: ReactNode = null;
  if (cancelled || item.is_past || checkedIn) {
    action = null;
  } else if (booking && minutes <= CHECK_IN_OPENS_MINUTES && ending > 0) {
    action = (
      <Button label="Κάνε check-in" onPress={() => checkIn(booking.id)} pending={pending} />
    );
  } else if (booking && started) {
    action = <Text style={muted}>Το μάθημα έχει τελειώσει.</Text>;
  } else if (booking && minutes <= CANCEL_CUTOFF_MINUTES) {
    action = (
      <Text style={muted}>
        Η ακύρωση κλείνει μία ώρα πριν από το μάθημα. Το check-in ανοίγει{" "}
        {CHECK_IN_OPENS_MINUTES} λεπτά πριν.
      </Text>
    );
  } else if (booking) {
    action = (
      <Button
        label="Ακύρωση κράτησης"
        tone="dangerOutline"
        onPress={() => {
          setError(null);
          setAsking(true);
        }}
      />
    );
  } else if (started) {
    action = <Text style={muted}>Το μάθημα έχει ξεκινήσει.</Text>;
  } else if (left > 0 && confirm) {
    action = (
      <>
        <Text style={[typography.body, { color: colors.text }]}>{confirm}</Text>
        <Button label="Κλείσε θέση" onPress={() => book(true)} pending={pending} />
        <Button
          label="Άκυρο"
          tone="plain"
          onPress={() => setConfirm(null)}
          disabled={pending}
        />
      </>
    );
  } else if (left > 0) {
    action = <Button label="Κλείσε θέση" onPress={() => book(false)} pending={pending} />;
  }

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

      {booking && (
        <Text style={[typography.headline, { color: colors.primary }]}>
          ✓{" "}
          {checkedIn
            ? "Έκανες check-in."
            : item.is_past
              ? "Είχες κλείσει θέση."
              : "Έχεις κλείσει θέση."}
        </Text>
      )}
      {note && <Text style={muted}>{note}</Text>}

      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: spacing.xl, gap: spacing.md },
  heading: { gap: spacing.xs, marginBottom: spacing.xs },
});
