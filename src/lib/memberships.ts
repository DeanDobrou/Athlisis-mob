import { longDate } from "@/lib/dates";
import type { Membership } from "@/lib/schedule";

export const money = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });

/** Within this many days, or visits, a membership shows as running out. */
const ENDING_DAYS = 7;
const ENDING_VISITS = 2;

const daysUntil = (day: string, now: string) =>
  Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${now}T00:00:00Z`)) / 86_400_000);

/** Over: a period that has ended, or a pack with no end date and no visits left. */
const isOver = (m: Membership, now: string) =>
  m.ends_on !== null ? m.ends_on < now : m.visits_remaining === 0;

/**
 * The member's memberships as the account screens group them: running now
 * (the soonest to end first), starting later, and ended but still owed. The
 * server sends nothing else; ended paid ones come from the history instead.
 */
export function groupMemberships(list: Membership[], now: string) {
  return {
    current: list
      .filter((m) => m.starts_on <= now && !isOver(m, now))
      .sort((a, b) => (a.ends_on ?? "9999").localeCompare(b.ends_on ?? "9999")),
    upcoming: list
      .filter((m) => m.starts_on > now)
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on)),
    unpaidPast: list.filter((m) => m.starts_on <= now && isOver(m, now)),
    owedCents: list.reduce((sum, m) => sum + (m.owed_cents ?? 0), 0),
  };
}

/** How a running membership stands, in one line, and whether it is running out. */
export function standing(m: Membership, now: string): { text: string; ending: boolean } {
  const days = m.ends_on === null ? null : daysUntil(m.ends_on, now);
  const soon = days !== null && days <= ENDING_DAYS;
  const end =
    m.ends_on === null || days === null
      ? null
      : days === 0
        ? "λήγει σήμερα"
        : soon
          ? `λήγει σε ${days} ${days === 1 ? "μέρα" : "μέρες"}`
          : `έως ${longDate(m.ends_on)}`;

  if (m.visits_remaining !== null) {
    const n = m.visits_remaining;
    const visits = n === 0 ? "Χωρίς άλλες επισκέψεις" : `${n} ${n === 1 ? "επίσκεψη" : "επισκέψεις"} ακόμη`;
    return { text: end ? `${visits} · ${end}` : visits, ending: soon || n <= ENDING_VISITS };
  }
  if (end === null) return { text: "Χωρίς λήξη", ending: false };
  return { text: soon ? end[0].toUpperCase() + end.slice(1) : `Ενεργή ${end}`, ending: soon };
}
