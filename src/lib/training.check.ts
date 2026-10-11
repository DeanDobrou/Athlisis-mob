// Run: npx tsx src/lib/training.check.ts
import { timeBefore, weekTitle } from "@/lib/dates";
import type { MemberClass } from "@/lib/schedule";
import { nextTraining } from "@/lib/training";

const check = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message);
};

// Wednesday 7 October 2026, 12:40 on the phone's clock.
const now = new Date(2026, 9, 7, 12, 40);
const at = (day: string, start: string, extra: Partial<MemberClass> = {}): MemberClass => ({
  id: `${day} ${start}`,
  day,
  start_time: start,
  end_time: timeBefore(start, -60),
  capacity: 12,
  status: "scheduled",
  is_past: `${day} ${start}` < "2026-10-07 12:40",
  types: [],
  booked: 5,
  my_booking: null,
  ...extra,
});
const booked = { my_booking: { id: "b", status: "booked" } };
const attended = { my_booking: { id: "b", status: "checked_in" } };

check(weekTitle("2026-10-05") === "5 – 9 Οκτωβρίου", "a week inside one month");
check(weekTitle("2026-09-28") === "28 Σεπ – 2 Οκτ", "a week across two months");
check(timeBefore("18:00", 60) === "17:00", "an hour back");
check(timeBefore("18:00", 10) === "17:50", "ten minutes back");

const history = [
  at("2026-09-30", "18:00", attended),
  at("2026-10-05", "18:00", attended),
  at("2026-10-06", "19:00", attended),
];

check(
  nextTraining([...history, at("2026-10-08", "18:00", booked)], now)?.kind === "booked",
  "the next booking comes first",
);
check(
  nextTraining([...history, at("2026-10-07", "12:45", booked)], now)?.kind === "checkIn",
  "check-in opens 10 minutes before",
);
check(
  nextTraining([...history, at("2026-10-07", "12:00", attended)], now)?.kind === "checkedIn",
  "a checked-in class shows until it ends",
);

check(
  nextTraining([...history, at("2026-10-08", "18:00")], now) === null,
  "nothing booked ahead, nothing to show",
);

console.log("training checks passed");
