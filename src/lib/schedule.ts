import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { api, apiIfChanged, ApiError, errorMessage } from "@/lib/api";
import { getToken, onSignOut } from "@/lib/session";

export type ClassType = { id: string; name: string; color_hex: string | null };

export type MemberClass = {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: "scheduled" | "cancelled";
  is_past: boolean;
  types: ClassType[];
  booked: number;
  my_booking: { id: string; status: string } | null;
};

export type Membership = {
  id: string;
  plan_name: string;
  starts_on: string;
  ends_on: string | null;
  visits_remaining: number | null;
  owed_cents: number | null;
  state: string;
};

export type Profile = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
};

type SyncData = {
  classes: MemberClass[];
  memberships?: Membership[];
  profile?: Profile;
};

type ScheduleState = {
  classes: MemberClass[] | null;
  memberships: Membership[] | null;
  profile: Profile | null;
  refreshing: boolean;
  error: string | null;
};

/** The parts of a sync reply the app shows; an older server leaves memberships and profile out. */
function shown(data: SyncData) {
  return {
    classes: data.classes,
    memberships: data.memberships ?? null,
    profile: data.profile ?? null,
  };
}

// ponytail: the browser has no file system, so web skips the offline copy
const cache =
  Platform.OS === "web" ? null : new File(Paths.document, "schedule.json");

/** After this long without a check, the next touch refreshes the schedule. */
const STALE_AFTER_MS = 3 * 60 * 1000;

let state: ScheduleState = {
  classes: null,
  memberships: null,
  profile: null,
  refreshing: false,
  error: null,
};
let etag: string | null = null;
let cacheRead = false;
let again = false;
let lastAttempt = 0;
/**
 * Counts sign-outs, so a reply that lands after one is not applied to the next
 * member. Not the token: a password change replaces it for the same member.
 */
let session = 0;
const listeners = new Set<() => void>();

function set(next: Partial<ScheduleState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The schedule, re-rendering the component when it changes. */
export function useSchedule(): ScheduleState {
  return useSyncExternalStore(subscribe, () => state);
}

async function readCache() {
  cacheRead = true;
  if (!cache?.exists) return;
  try {
    const saved = JSON.parse(await cache.text());
    etag = saved.etag ?? null;
    set(shown(saved));
  } catch {
    etag = null;
  }
}

/** Shows the stored copy straight away, then asks the server for anything newer. */
export async function loadSchedule(): Promise<void> {
  if (!cacheRead) await readCache();
  await refreshSchedule();
}

/**
 * Fetches the schedule unless the stored copy is still current. A call made
 * while one is running runs again afterwards, so a booking is never
 * overwritten by a reply that was already on its way.
 */
export async function refreshSchedule(): Promise<void> {
  if (state.refreshing) {
    again = true;
    return;
  }
  const started = session;
  const token = getToken();
  lastAttempt = Date.now();
  set({ refreshing: true, error: null });

  try {
    const fresh = await apiIfChanged<SyncData>(
      "/api/sync",
      etag,
    );
    // Signed out meanwhile: the reset already ran, and a newer refresh may own the state.
    if (session !== started) return;
    // A password change only replaced the token: this is still the member's schedule.
    if (fresh) {
      set(shown(fresh.data));
      etag = fresh.etag;
      // The stored copy is only for offline starts: a failed write (a full
      // phone) must not keep the new reply off the screen.
      try {
        cache?.create({ overwrite: true });
        cache?.write(JSON.stringify({ etag, ...shown(fresh.data) }));
      } catch {}
    }
    set({ refreshing: false });
  } catch (e) {
    if (session !== started) return;
    // Failed on a token a password change has since replaced: try again with the new one.
    const replaced = getToken() !== token;
    if (replaced) again = true;
    set({ refreshing: false, error: replaced ? null : errorMessage(e) });
  }

  if (again) {
    again = false;
    await refreshSchedule();
  }
}

/** Refreshes if the last check, even a failed one, was more than three minutes ago. */
export function refreshIfStale(): void {
  if (getToken() && !state.refreshing && Date.now() - lastAttempt > STALE_AFTER_MS) {
    void refreshSchedule();
  }
}

/**
 * Throws if the member who sent a request has signed out since, so neither the
 * store nor the screen that asked acts on a reply meant for someone else.
 */
function stillSignedIn(started: number): void {
  if (session !== started) throw new Error("Αποσυνδέθηκες.");
}

/** Saves the member's own details and shows them straight away. */
export async function saveProfile(
  details: Pick<Profile, "first_name" | "last_name" | "phone" | "date_of_birth">,
): Promise<void> {
  const started = session;
  const profile = await api<Profile>("/api/user-profile", { method: "PATCH", body: details });
  stillSignedIn(started);
  set({ profile });
  void refreshSchedule();
}

/** Switches the account to the new email address, with the code that was sent to it. */
export async function confirmEmail(code: string): Promise<void> {
  const started = session;
  const { email } = await api<{ email: string }>("/api/user-profile/email/confirm", {
    body: { code },
  });
  stillSignedIn(started);
  if (state.profile) set({ profile: { ...state.profile, email } });
  void refreshSchedule();
}

function patch(classId: string, change: (c: MemberClass) => MemberClass) {
  set({ classes: state.classes?.map((c) => (c.id === classId ? change(c) : c)) ?? null });
}

/**
 * Books a class. With no coverage the server asks first: this returns its
 * message and books nothing until called again with `confirmUnpaid`.
 * A refusal refreshes the schedule, since the phone's copy may be out of date.
 */
export async function bookClass(
  classId: string,
  confirmUnpaid: boolean,
): Promise<{ confirm: string } | null> {
  const started = session;
  try {
    const { id } = await api<{ id: string }>("/api/bookings", {
      body: { classId, confirm: confirmUnpaid },
    });
    stillSignedIn(started);
    patch(classId, (c) => ({
      ...c,
      booked: c.booked + 1,
      my_booking: { id, status: "booked" },
    }));
    void refreshSchedule();
    return null;
  } catch (e) {
    const body = e instanceof ApiError ? (e.body as { confirm?: boolean }) : null;
    if (e instanceof ApiError && body?.confirm) return { confirm: e.message };
    if (e instanceof ApiError) void refreshSchedule();
    throw e;
  }
}

/**
 * Cancels a booking. Returns what the member still owes, if anything.
 * A refusal refreshes the schedule, since the phone's copy may be out of date.
 */
export async function cancelClass(
  classId: string,
  bookingId: string,
): Promise<string | null> {
  const started = session;
  let reply: { notice?: string };
  try {
    reply = await api<{ notice?: string }>("/api/bookings/" + bookingId, {
      method: "DELETE",
    });
  } catch (e) {
    if (e instanceof ApiError) void refreshSchedule();
    throw e;
  }
  stillSignedIn(started);
  patch(classId, (c) => ({
    ...c,
    booked: Math.max(0, c.booked - 1),
    my_booking: null,
  }));
  void refreshSchedule();
  return reply.notice ?? null;
}

/**
 * Checks in to a booking.
 * A refusal refreshes the schedule, since the phone's copy may be out of date.
 */
export async function checkInClass(classId: string, bookingId: string): Promise<void> {
  const started = session;
  try {
    await api(`/api/bookings/${bookingId}/check-in`, { method: "POST" });
  } catch (e) {
    if (e instanceof ApiError) void refreshSchedule();
    throw e;
  }
  stillSignedIn(started);
  patch(classId, (c) => ({ ...c, my_booking: { id: bookingId, status: "checked_in" } }));
  void refreshSchedule();
}

onSignOut(() => {
  session += 1;
  etag = null;
  cacheRead = false;
  again = false;
  if (cache?.exists) cache.delete();
  set({ classes: null, memberships: null, profile: null, refreshing: false, error: null });
});
