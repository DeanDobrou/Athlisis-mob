import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTabBarSpace } from "@/components/tab-bar";
import { api, errorMessage } from "@/lib/api";
import { longDate, today } from "@/lib/dates";
import { groupMemberships, money, standing } from "@/lib/memberships";
import { refreshSchedule, useSchedule, type Membership } from "@/lib/schedule";
import { radius, spacing, typography, useColors } from "@/lib/theme";

/** A paid membership that is over, as GET /api/user-profile/memberships sends it. */
type PastMembership = {
  id: string;
  plan_name: string;
  starts_on: string;
  ends_on: string | null;
  amount_cents: number;
  method: "cash" | "pos_terminal" | "other";
  paid_on: string;
};

const METHODS = { cash: "Μετρητά", pos_terminal: "Κάρτα", other: "Άλλος τρόπος" };

type Line = { text: string; tone?: "muted" | "warning" | "danger" };

/** Every membership: running, upcoming, still owed, and the paid history page by page. */
export default function MembershipsScreen() {
  const colors = useColors();
  const tabBarSpace = useTabBarSpace();
  const { memberships } = useSchedule();
  const [history, setHistory] = useState<PastMembership[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const now = today();

  /** Fetches the first page of history, or the page after `before`, and shows it when it lands. */
  function fetchPage(before: string | null) {
    return api<{ memberships: PastMembership[]; next: string | null }>(
      "/api/user-profile/memberships" + (before ? `?before=${encodeURIComponent(before)}` : ""),
    )
      .then(
        (page) => {
          setHistory((shown) => (before ? [...shown, ...page.memberships] : page.memberships));
          setNext(page.next);
        },
        (e: unknown) => setError(errorMessage(e)),
      )
      .finally(() => setLoading(false));
  }

  function load(before: string | null) {
    setLoading(true);
    setError(null);
    return fetchPage(before);
  }

  // The first page; `loading` already starts true.
  useEffect(() => {
    void fetchPage(null);
  }, []);

  async function pull() {
    setPulling(true);
    await Promise.all([refreshSchedule(), load(null)]);
    setPulling(false);
  }

  const groups = memberships && groupMemberships(memberships, now);
  const owed = (m: Membership): Line[] =>
    m.owed_cents === null ? [] : [{ text: `Οφείλεις ${money.format(m.owed_cents / 100)}`, tone: "danger" }];

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
      {groups && (
        <Section title="Τρέχουσα">
          {groups.current.length === 0 ? (
            <Row title="Καμία ενεργή συνδρομή" lines={[]} />
          ) : (
            groups.current.map((m) => {
              const state = standing(m, now);
              return (
                <Row
                  key={m.id}
                  title={m.plan_name}
                  lines={[{ text: state.text, tone: state.ending ? "warning" : "muted" }, ...owed(m)]}
                />
              );
            })
          )}
        </Section>
      )}

      {groups && groups.upcoming.length > 0 && (
        <Section title="Επόμενες">
          {groups.upcoming.map((m) => (
            <Row
              key={m.id}
              title={m.plan_name}
              lines={[
                {
                  text:
                    `Ξεκινά ${longDate(m.starts_on)}` +
                    (m.ends_on ? ` · έως ${longDate(m.ends_on)}` : ""),
                },
                ...owed(m),
              ]}
            />
          ))}
        </Section>
      )}

      {groups && groups.unpaidPast.length > 0 && (
        <Section title="Ανεξόφλητες">
          {groups.unpaidPast.map((m) => (
            <Row
              key={m.id}
              title={m.plan_name}
              lines={[
                { text: m.ends_on ? `Έληξε ${longDate(m.ends_on)}` : "Ολοκληρώθηκε" },
                ...owed(m),
              ]}
            />
          ))}
        </Section>
      )}

      <Section title="Ιστορικό">
        {history.map((m) => (
          <Row
            key={m.id}
            title={m.plan_name}
            lines={[
              {
                text: m.ends_on
                  ? `${longDate(m.starts_on)} – ${longDate(m.ends_on)}`
                  : `Από ${longDate(m.starts_on)}`,
              },
              {
                text:
                  m.amount_cents === 0
                    ? "Δωρεάν"
                    : `Πληρώθηκε ${longDate(m.paid_on)} · ${money.format(m.amount_cents / 100)} · ${METHODS[m.method]}`,
              },
            ]}
          />
        ))}
        {loading ? (
          <View style={styles.row}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void load(history.length > 0 ? next : null)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.accent }]}
          >
            <Text selectable style={[typography.subhead, { color: colors.destructive }]}>
              {error}
            </Text>
            <Text style={[typography.body, { color: colors.text }]}>Δοκίμασε ξανά</Text>
          </Pressable>
        ) : next ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void load(next)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.accent }]}
          >
            <Text style={[typography.body, { color: colors.text }]}>Περισσότερα</Text>
          </Pressable>
        ) : (
          history.length === 0 && <Row title="Δεν υπάρχει ιστορικό ακόμη." lines={[]} muted />
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[typography.footnote, styles.header, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ title, lines, muted }: { title: string; lines: Line[]; muted?: boolean }) {
  const colors = useColors();
  const tones = { muted: colors.textMuted, warning: colors.warning, danger: colors.destructive };
  return (
    <View style={[styles.row, styles.divided, { borderColor: colors.border }]}>
      <Text style={[muted ? typography.body : typography.headline, { color: muted ? colors.textMuted : colors.text }]}>
        {title}
      </Text>
      {lines.map((line) => (
        <Text
          key={line.text}
          style={[
            typography.subhead,
            line.tone && line.tone !== "muted" && styles.bold,
            { color: tones[line.tone ?? "muted"] },
          ]}
        >
          {line.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.sm },
  header: { paddingHorizontal: spacing.lg },
  group: { borderRadius: radius.lg, borderCurve: "continuous", overflow: "hidden" },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2 },
  // A hairline above each row; the group's clipping hides the first one.
  divided: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: -StyleSheet.hairlineWidth },
  bold: { fontWeight: "600" },
});
