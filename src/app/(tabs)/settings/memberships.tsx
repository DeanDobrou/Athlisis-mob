import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Section } from "@/components/section";
import { TabScroll } from "@/components/tab-scroll";
import { api, errorMessage } from "@/lib/api";
import type { HistoryPage, Membership, PastMembership } from "@/lib/contract";
import { longDate, today } from "@/lib/dates";
import { groupMemberships, money, standing } from "@/lib/memberships";
import { refreshSchedule, useSchedule } from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";

const METHODS: Record<PastMembership["method"], string> = {
  cash: "Μετρητά",
  pos_terminal: "Κάρτα",
  other: "Άλλος τρόπος",
};

type Line = { text: string; tone?: "muted" | "warning" | "danger" };

/** Every membership: running, upcoming, still owed, and the paid history page by page. */
export default function MembershipsScreen() {
  const colors = useColors();
  const { memberships } = useSchedule();
  const [history, setHistory] = useState<PastMembership[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Counts fresh starts, so a page still loading for a list a refresh replaced is dropped
  // instead of being added after the new first page.
  const starts = useRef(0);
  const now = today();

  /** Fetches the first page of history, or the page after `before`, and shows it when it lands. */
  function fetchPage(before: string | null) {
    if (before === null) starts.current += 1;
    const start = starts.current;
    const current = () => start === starts.current;
    return api<HistoryPage>(
      "/api/user-profile/memberships" + (before ? `?before=${encodeURIComponent(before)}` : ""),
    )
      .then(
        (page) => {
          if (!current()) return;
          setHistory((shown) => (before ? [...shown, ...page.memberships] : page.memberships));
          setNext(page.next);
        },
        (e: unknown) => {
          if (current()) setError(errorMessage(e));
        },
      )
      .finally(() => {
        if (current()) setLoading(false);
      });
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

  const groups = memberships && groupMemberships(memberships, now);
  const owed = (m: Membership): Line[] =>
    m.owed_cents === null ? [] : [{ text: `Οφείλεις ${money.format(m.owed_cents / 100)}`, tone: "danger" }];

  return (
    <TabScroll
      onRefresh={() => Promise.all([refreshSchedule(), load(null)])}
      contentContainerStyle={styles.content}
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
    </TabScroll>
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
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2 },
  // A hairline above each row; the group's clipping hides the first one.
  divided: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: -StyleSheet.hairlineWidth },
  bold: { fontWeight: "600" },
});
