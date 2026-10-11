import { minutesUntil } from "@/lib/dates";
import type { MemberClass } from "@/lib/schedule";

/** Members may cancel until this many minutes before a class, as on the server. */
export const CANCEL_CUTOFF_MINUTES = 60;

/** Members may check in from this many minutes before a class until it ends, as on the server. */
export const CHECK_IN_OPENS_MINUTES = 10;

/** At this many free places or fewer, a class shows as filling up. */
export const FEW_PLACES = 3;

export type NextTraining =
  | { kind: "booked"; item: MemberClass }
  | { kind: "checkIn"; item: MemberClass; minutes: number }
  | { kind: "checkedIn"; item: MemberClass };

/** What the top of the schedule shows: the next booking, or its check-in once it opens. */
export function nextTraining(classes: MemberClass[], now = new Date()): NextTraining | null {
  const running = classes
    .filter((c) => c.status !== "cancelled")
    .sort((a, b) => `${a.day} ${a.start_time}`.localeCompare(`${b.day} ${b.start_time}`));

  const next = running.find((c) => c.my_booking && minutesUntil(c.day, c.end_time, now) > 0);
  if (!next) return null;
  const minutes = minutesUntil(next.day, next.start_time, now);
  if (next.my_booking?.status === "checked_in") return { kind: "checkedIn", item: next };
  if (minutes <= CHECK_IN_OPENS_MINUTES) return { kind: "checkIn", item: next, minutes };
  return { kind: "booked", item: next };
}
