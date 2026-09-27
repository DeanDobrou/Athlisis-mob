import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { ApiError } from "@/lib/api";
import { minutesUntil, shortDate, weekdayName } from "@/lib/dates";
import { bookClass, cancelClass, useSchedule } from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";

/** Members may cancel until this many minutes before a class, as on the server. */
const CANCEL_CUTOFF_MINUTES = 60;

export default function ClassSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classes } = useSchedule();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

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
  const cancelled = item.status === "cancelled";
  const booking = cancelled ? null : item.my_booking;
  const left = Math.max(0, item.capacity - item.booked);
  const types = item.types.map((t) => t.name).join(" · ") || "Μάθημα";
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
      setError(
        e instanceof ApiError ? e.message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
      );
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
    Alert.alert("Ακύρωση κράτησης", "Θέλεις σίγουρα να ακυρώσεις τη θέση σου;", [
      { text: "Όχι", style: "cancel" },
      {
        text: "Ακύρωση κράτησης",
        style: "destructive",
        onPress: () =>
          void run(async () => {
            setNote(await cancelClass(item!.id, bookingId));
          }),
      },
    ]);
  }

  let action: ReactNode = null;
  if (cancelled || item.is_past) {
    action = null;
  } else if (booking) {
    action = started ? (
      <Text style={muted}>Το μάθημα έχει ξεκινήσει.</Text>
    ) : minutes > CANCEL_CUTOFF_MINUTES ? (
      <Button
        label="Ακύρωση κράτησης"
        tone="danger"
        onPress={() => cancel(booking.id)}
        pending={pending}
      />
    ) : (
      <Text style={muted}>Η ακύρωση κλείνει μία ώρα πριν από το μάθημα.</Text>
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

      <Text style={[typography.headline, { color: colors.text }]}>{types}</Text>
      <Text style={muted}>{places}</Text>

      {booking && (
        <Text style={[typography.headline, { color: colors.text }]}>
          ✓ {item.is_past ? "Είχες κλείσει θέση." : "Έχεις κλείσει θέση."}
        </Text>
      )}
      {note && <Text style={muted}>{note}</Text>}
      {error && (
        <Text
          accessibilityRole="alert"
          style={[typography.body, { color: colors.destructive }]}
        >
          {error}
        </Text>
      )}

      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: spacing.xl, gap: spacing.md },
  heading: { gap: spacing.xs, marginBottom: spacing.xs },
});
