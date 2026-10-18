import type { Booking, MemberClass } from "@/lib/contract";
import { minutesUntil } from "@/lib/dates";

/** Members may cancel until this many minutes before a class, as on the server. */
export const CANCEL_CUTOFF_MINUTES = 60;

/** Members may check in from this many minutes before a class until it ends, as on the server. */
export const CHECK_IN_OPENS_MINUTES = 10;

/** At this many free places or fewer, a class shows as filling up. */
export const FEW_PLACES = 3;

/**
 * What a class is for the member right now, which decides what they can do
 * with it. Every status carries the places left and the minutes to the start.
 */
export type ClassStatus = { left: number; minutes: number } & (
  | { kind: "cancelled" }
  // Over, by the server's last word or the phone's clock.
  | { kind: "ended"; booking: Booking | null }
  // Booked: checked in, check-in open, too late to cancel, or still free to cancel.
  | { kind: "checkedIn" | "checkIn" | "cancelClosed" | "booked"; booking: Booking }
  // Not booked: under way, another class booked that day, full, or open to book.
  | { kind: "started" | "bookedThatDay" | "full" | "open" }
);

type Booked = Extract<ClassStatus, { booking: Booking }>;

/** Whether the member holds a place in any of these classes. */
export function hasBooking(classes: MemberClass[]): boolean {
  return classes.some((c) => c.status !== "cancelled" && c.my_booking !== null);
}

/**
 * The class's status at `now`, by the server's rules. `classes` holds at least
 * that day's others, since the server takes one class a day per member.
 */
export function classStatus(item: MemberClass, classes: MemberClass[], now: Date): ClassStatus {
  const base = {
    left: Math.max(0, item.capacity - item.booked),
    minutes: minutesUntil(item.day, item.start_time, now),
  };
  const booking = item.my_booking;

  if (item.status === "cancelled") return { ...base, kind: "cancelled" };
  if (item.is_past || minutesUntil(item.day, item.end_time, now) <= 0) {
    return { ...base, kind: "ended", booking };
  }
  if (booking) {
    const kind =
      booking.status === "checked_in"
        ? "checkedIn"
        : base.minutes <= CHECK_IN_OPENS_MINUTES
          ? "checkIn"
          : base.minutes <= CANCEL_CUTOFF_MINUTES
            ? "cancelClosed"
            : "booked";
    return { ...base, kind, booking };
  }
  if (base.minutes <= 0) return { ...base, kind: "started" };
  if (hasBooking(classes.filter((c) => c.day === item.day))) {
    return { ...base, kind: "bookedThatDay" };
  }
  return { ...base, kind: base.left === 0 ? "full" : "open" };
}

/** How a class shows in the week timetable and the day list. */
export type ClassLook = "cancelled" | "booked" | "attended" | "gone" | "full" | "open";

const LOOK_TEXT: Record<Exclude<ClassLook, "open">, string> = {
  cancelled: "ακυρώθηκε",
  booked: "έχεις κλείσει θέση",
  attended: "είχες κλείσει θέση",
  gone: "έχει περάσει",
  full: "πλήρες",
};

function lookOf(status: ClassStatus): ClassLook {
  switch (status.kind) {
    case "cancelled":
      return "cancelled";
    case "ended":
      return status.booking ? "attended" : "gone";
    case "checkedIn":
    case "checkIn":
    case "cancelClosed":
    case "booked":
      return "booked";
    default:
      return status.left === 0 ? "full" : "open";
  }
}

/** The look for a status, and the few words that say it. */
export function classLook(status: ClassStatus): { look: ClassLook; text: string } {
  const look = lookOf(status);
  const text =
    look === "open" ? `${status.left} ${status.left === 1 ? "θέση" : "θέσεις"}` : LOOK_TEXT[look];
  return { look, text };
}

/** The member's next booked class that is not over, for the top of the schedule. */
export function nextTraining(
  classes: MemberClass[],
  now = new Date(),
): { item: MemberClass; status: Booked } | null {
  const booked = classes
    .filter((c) => c.my_booking)
    .sort((a, b) => `${a.day} ${a.start_time}`.localeCompare(`${b.day} ${b.start_time}`));
  for (const item of booked) {
    const status = classStatus(item, classes, now);
    if ("booking" in status && status.kind !== "ended") return { item, status };
  }
  return null;
}
