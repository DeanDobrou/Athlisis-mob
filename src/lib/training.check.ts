// Run: npx tsx src/lib/training.check.ts
import type { MemberClass } from "@/lib/contract";
import { timeBefore, weekTitle } from "@/lib/dates";
import { classLook, classStatus, dayFold, nextTraining } from "@/lib/training";

const check = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message);
};

// Wednesday 7 October 2026, 12:40 on the phone's clock.
const now = new Date(2026, 9, 7, 12, 40);
const at = (day: string, start: string, extra: Partial<MemberClass> = {}): MemberClass => {
  const end = timeBefore(start, -60);
  return {
    id: `${day} ${start}`,
    day,
    start_time: start,
    end_time: end,
    capacity: 12,
    status: "scheduled",
    // As the server sets it: the class had ended by the last sync.
    is_past: `${day} ${end}` < "2026-10-07 12:40",
    types: [],
    booked: 5,
    my_booking: null,
    ...extra,
  };
};
const booked: Partial<MemberClass> = { my_booking: { id: "b", status: "booked" } };
const attended: Partial<MemberClass> = { my_booking: { id: "b", status: "checked_in" } };

check(weekTitle("2026-10-05") === "5 – 9 Οκτωβρίου", "a week inside one month");
check(weekTitle("2026-09-28") === "28 Σεπ – 2 Οκτ", "a week across two months");
check(timeBefore("18:00", 60) === "17:00", "an hour back");
check(timeBefore("18:00", 10) === "17:50", "ten minutes back");

// What the class sheet offers, by the server's rules.
const kind = (item: MemberClass, others: MemberClass[] = []) =>
  classStatus(item, [item, ...others], now).kind;

check(kind(at("2026-10-08", "18:00")) === "open", "a class with places is open to book");
check(kind(at("2026-10-08", "18:00", { booked: 12 })) === "full", "a class with none is full");
check(kind(at("2026-10-08", "18:00", booked)) === "booked", "a booking more than an hour off can be cancelled");
check(kind(at("2026-10-07", "13:30", booked)) === "cancelClosed", "within the hour cancelling has closed");
check(kind(at("2026-10-07", "12:45", booked)) === "checkIn", "check-in opens 10 minutes before");
check(kind(at("2026-10-07", "12:00", booked)) === "checkIn", "and stays open until the class ends");
check(kind(at("2026-10-07", "12:00", attended)) === "checkedIn", "a checked-in class");
check(kind(at("2026-10-07", "12:00")) === "started", "a class under way can no longer be booked");
check(
  kind(at("2026-10-07", "18:00"), [at("2026-10-07", "08:00", attended)]) === "bookedThatDay",
  "one class a day",
);
check(
  kind(at("2026-10-07", "18:00"), [at("2026-10-07", "08:00", { ...booked, status: "cancelled" })]) ===
    "open",
  "a booking on a cancelled class does not use up the day",
);
check(
  kind(at("2026-10-07", "11:00", { is_past: false })) === "ended",
  "the phone's clock ends a class the last sync had not",
);
check(kind(at("2026-10-08", "18:00", { ...booked, status: "cancelled" })) === "cancelled", "a cancelled class");

// How the timetable and the day list show a class.
const look = (item: MemberClass) => classLook(classStatus(item, [item], now));
check(look(at("2026-10-06", "19:00", attended)).text === "είχες κλείσει θέση", "a past booking");
check(look(at("2026-10-06", "19:00")).look === "gone", "a past class the member missed");
check(look(at("2026-10-07", "12:00", { booked: 12 })).look === "full", "a full class under way");
check(look(at("2026-10-08", "18:00", { booked: 11 })).text === "1 θέση", "one place left");

const history = [
  at("2026-09-30", "18:00", attended),
  at("2026-10-05", "18:00", attended),
  at("2026-10-06", "19:00", attended),
];

check(
  nextTraining([...history, at("2026-10-08", "18:00", booked)], now)?.status.kind === "booked",
  "the next booking comes first",
);
check(
  nextTraining([...history, at("2026-10-07", "12:45", booked)], now)?.status.kind === "checkIn",
  "check-in opens 10 minutes before",
);
check(
  nextTraining([...history, at("2026-10-07", "12:00", attended)], now)?.status.kind === "checkedIn",
  "a checked-in class shows until it ends",
);

check(
  nextTraining([...history, at("2026-10-08", "18:00")], now) === null,
  "nothing booked ahead, nothing to show",
);

// What the week view folds away on a day.
const fold = (...items: MemberClass[]) => dayFold(items.map((c) => classStatus(c, items, now)));
const cancelled: Partial<MemberClass> = { status: "cancelled" };
{
  const past = fold(
    at("2026-10-06", "10:00"),
    at("2026-10-06", "17:00", attended),
    at("2026-10-06", "18:00", cancelled),
  );
  check(
    past.hidden === 3 && past.count === 2 && past.booked,
    "a day that is over folds whole, with the member's class marked",
  );
  const today = fold(at("2026-10-07", "10:00"), at("2026-10-07", "11:00"), at("2026-10-07", "17:00"));
  check(
    today.hidden === 2 && today.count === 2 && !today.booked,
    "today folds the finished classes it starts with",
  );
  check(
    fold(at("2026-10-07", "10:00", attended), at("2026-10-07", "17:00")).hidden === 0,
    "the member's own class stays out of today's fold",
  );
  const early = fold(
    at("2026-10-07", "07:00", cancelled),
    at("2026-10-07", "10:00"),
    at("2026-10-07", "15:00", cancelled),
    at("2026-10-07", "17:00"),
  );
  check(
    early.hidden === 2 && early.count === 1,
    "a cancelled class folds with the finished ones after it, not on its own",
  );
  const over = fold(at("2026-10-07", "10:00"), at("2026-10-07", "19:00", cancelled));
  check(over.hidden === 2 && over.count === 1, "a cancelled class still to come leaves the day over");
  check(fold(at("2026-10-08", "17:00", cancelled)).hidden === 0, "a future day of cancelled classes is not over");
  check(fold().hidden === 0, "a day without classes folds nothing");
}

console.log("training checks passed");
