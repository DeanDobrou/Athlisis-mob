// Run: npx tsx src/lib/memberships.check.ts
import { groupMemberships, standing } from "@/lib/memberships";
import type { Membership } from "@/lib/schedule";

const check = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message);
};

const now = "2026-10-13";
const m = (extra: Partial<Membership>): Membership => ({
  id: "1",
  plan_name: "Unlimited",
  starts_on: "2026-10-01",
  ends_on: "2026-11-01",
  visits_remaining: null,
  owed_cents: null,
  state: "active",
  ...extra,
});

const groups = groupMemberships(
  [
    m({ id: "pack", ends_on: null, visits_remaining: 6 }),
    m({ id: "month", ends_on: "2026-10-31" }),
    m({ id: "next", starts_on: "2026-11-01", ends_on: "2026-12-01", owed_cents: 5000 }),
    m({ id: "old", starts_on: "2026-08-01", ends_on: "2026-09-01", owed_cents: 4000 }),
    m({ id: "empty pack", starts_on: "2026-09-01", ends_on: null, visits_remaining: 0, owed_cents: 2000 }),
  ],
  now,
);
check(groups.current.map((x) => x.id).join() === "month,pack", "running now, the soonest to end first");
check(groups.upcoming.map((x) => x.id).join() === "next", "starting later");
check(groups.unpaidPast.map((x) => x.id).join() === "old,empty pack", "ended but still owed");
check(groups.owedCents === 11000, "every debt adds up");

check(standing(m({ ends_on: "2026-10-31" }), now).text === "Ενεργή έως 31/10/2026", "a period with time to go");
const soon = standing(m({ ends_on: "2026-10-18" }), now);
check(soon.text === "Λήγει σε 5 μέρες" && soon.ending, "a period ending within a week");
check(standing(m({ ends_on: "2026-10-13" }), now).text === "Λήγει σήμερα", "a period ending today");
const pack = standing(m({ ends_on: null, visits_remaining: 2 }), now);
check(pack.text === "2 επισκέψεις ακόμη" && pack.ending, "a pack with two visits left");
check(!standing(m({ ends_on: null, visits_remaining: 6 }), now).ending, "a pack with plenty left");
check(standing(m({ ends_on: null }), now).text === "Χωρίς λήξη", "open-ended and unlimited");

console.log("membership checks passed");
