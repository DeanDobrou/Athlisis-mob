import Constants from "expo-constants";
import { useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { longDate, today } from "@/lib/dates";
import { refreshSchedule, useSchedule, type Membership } from "@/lib/schedule";
import { radius, spacing, typography, useColors } from "@/lib/theme";

const money = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });

/** What a membership gives, in one line: when it starts or ends, and the visits left. */
function terms(m: Membership, now: string): string {
  const parts: string[] = [];
  if (m.starts_on > now) parts.push(`Ξεκινά ${longDate(m.starts_on)}`);
  if (m.ends_on) parts.push(`${m.ends_on < now ? "Έληξε" : "Έως"} ${longDate(m.ends_on)}`);
  if (m.visits_remaining !== null) {
    const n = m.visits_remaining;
    parts.push(`${n} ${n === 1 ? "επίσκεψη" : "επισκέψεις"} ακόμη`);
  } else if (!m.ends_on) {
    parts.push("Χωρίς λήξη");
  }
  return parts.join(" · ");
}

export default function AccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const { memberships, profile } = useSchedule();
  const [pulling, setPulling] = useState(false);
  const now = today();
  const group = [styles.group, { backgroundColor: colors.surface }];
  const muted = { color: colors.textMuted };

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
      {memberships && (
        <View style={styles.section}>
          <Text style={[typography.footnote, styles.header, muted]}>Συνδρομή</Text>
          <View style={group}>
            {memberships.length === 0 ? (
              <View style={styles.row}>
                <Text style={[typography.body, { color: colors.text }]}>
                  Δεν έχεις ενεργή συνδρομή.
                </Text>
              </View>
            ) : (
              memberships.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <Divider />}
                  <View style={styles.row}>
                    <Text style={[typography.headline, { color: colors.text }]}>{m.plan_name}</Text>
                    <Text style={[typography.subhead, muted]}>{terms(m, now)}</Text>
                    {m.owed_cents !== null && (
                      <Text style={[typography.subhead, { color: colors.destructive }]}>
                        Οφείλεις {money.format(m.owed_cents / 100)}.
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      <View style={group}>
        {profile && (
          <>
            <LinkRow label="Προφίλ" href="/settings/profile" />
            <Divider />
          </>
        )}
        <LinkRow label="Αλλαγή κωδικού" href="/settings/password" />
      </View>

      <View style={group}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings/sign-out")}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.accent }]}
        >
          <Text style={[typography.body, { color: colors.destructive }]}>Αποσύνδεση</Text>
        </Pressable>
      </View>

      <Text style={[typography.footnote, styles.version, muted]}>
        Athlisis {Constants.expoConfig?.version}
      </Text>
    </ScrollView>
  );
}

function LinkRow({ label, href }: { label: string; href: Href }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.link, pressed && { backgroundColor: colors.accent }]}
    >
      <Text style={[typography.body, styles.grow, { color: colors.text }]}>{label}</Text>
      {process.env.EXPO_OS === "ios" && (
        <SymbolView name="chevron.right" size={14} tintColor={colors.textMuted} />
      )}
    </Pressable>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.sm },
  header: { paddingHorizontal: spacing.lg },
  group: { borderRadius: radius.lg, borderCurve: "continuous", overflow: "hidden" },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  grow: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  version: { textAlign: "center" },
});
