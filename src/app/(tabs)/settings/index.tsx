import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Section } from "@/components/section";
import { TabScroll } from "@/components/tab-scroll";
import { sitePage } from "@/lib/api";
import type { Membership } from "@/lib/contract";
import { longDate, today } from "@/lib/dates";
import { groupMemberships, money, standing } from "@/lib/memberships";
import { refreshSchedule, useSchedule } from "@/lib/schedule";
import { spacing, typography, useColors } from "@/lib/theme";

export default function AccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const { memberships, profile } = useSchedule();

  return (
    <TabScroll onRefresh={refreshSchedule} contentContainerStyle={styles.content}>
      {memberships && <MembershipCard memberships={memberships} />}

      <Section>
        {profile && (
          <>
            <LinkRow label="Προφίλ" href="/settings/profile" />
            <Divider />
          </>
        )}
        <LinkRow label="Αλλαγή κωδικού" href="/settings/password" />
      </Section>

      {/* Both app stores want the privacy policy reachable from inside the app. */}
      <Section>
        <WebRow label="Πολιτική απορρήτου" path="/privacy" />
        <Divider />
        <WebRow label="Διαγραφή λογαριασμού" path="/privacy#delete" />
      </Section>

      <Section>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings/sign-out")}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.accent }]}
        >
          <Text style={[typography.body, { color: colors.destructive }]}>Αποσύνδεση</Text>
        </Pressable>
      </Section>

      <Text style={[typography.footnote, styles.version, { color: colors.textMuted }]}>
        Athlisis {Constants.expoConfig?.version}
      </Text>
    </TabScroll>
  );
}

/**
 * One card for the member's memberships, however many there are: the one
 * running now, the next one, and everything owed added up. The rest is a tap away.
 */
function MembershipCard({ memberships }: { memberships: Membership[] }) {
  const colors = useColors();
  const router = useRouter();
  const now = today();
  const { current, upcoming, owedCents } = groupMemberships(memberships, now);
  const main = current[0];
  const state = main && standing(main, now);
  const others = current.length - 1;
  const muted = [typography.subhead, { color: colors.textMuted }];

  return (
    <Section title="Συνδρομή">
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Δες όλες τις συνδρομές και το ιστορικό"
        onPress={() => router.push("/settings/memberships")}
        style={({ pressed }) => [styles.link, pressed && { backgroundColor: colors.accent }]}
      >
        <View style={[styles.grow, styles.lines]}>
          <Text style={[typography.headline, { color: colors.text }]}>
            {main ? main.plan_name : "Καμία ενεργή συνδρομή"}
          </Text>
          {state && (
            <Text
              style={[
                typography.subhead,
                state.ending && styles.bold,
                { color: state.ending ? colors.warning : colors.textMuted },
              ]}
            >
              {state.text}
            </Text>
          )}
          {others > 0 && (
            <Text style={muted}>
              +{others} ακόμη {others === 1 ? "ενεργή" : "ενεργές"}
            </Text>
          )}
          {upcoming[0] && (
            <Text style={muted}>
              Επόμενη: {upcoming[0].plan_name} από {longDate(upcoming[0].starts_on)}
            </Text>
          )}
          {owedCents > 0 && (
            <Text style={[typography.subhead, styles.bold, { color: colors.destructive }]}>
              Οφειλή {money.format(owedCents / 100)}
            </Text>
          )}
        </View>
        {process.env.EXPO_OS === "ios" && (
          <SymbolView name="chevron.right" size={14} tintColor={colors.textMuted} />
        )}
      </Pressable>
    </Section>
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

/** A row that opens a page of the gym's site in the browser. */
function WebRow({ label, path }: { label: string; path: string }) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(sitePage(path))}
      style={({ pressed }) => [styles.link, pressed && { backgroundColor: colors.accent }]}
    >
      <Text style={[typography.body, styles.grow, { color: colors.text }]}>{label}</Text>
      <SymbolView
        name={{ ios: "arrow.up.right", android: "open_in_new", web: "open_in_new" }}
        size={14}
        tintColor={colors.textMuted}
      />
    </Pressable>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  grow: { flex: 1 },
  lines: { gap: 2 },
  bold: { fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  version: { textAlign: "center" },
});
