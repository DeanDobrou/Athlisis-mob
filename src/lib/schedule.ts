import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { api, apiIfChanged, ApiError, errorMessage } from "@/lib/api";
import type {
  BookRefusal,
  BookReply,
  CancelReply,
  EmailReply,
  MemberClass,
  Membership,
  Profile,
  SyncData,
} from "@/lib/contract";
import { getToken, onSignOut } from "@/lib/session";

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
 * Every change the member makes goes through here. Sends it, shows the reply
 * with `apply`, then refreshes the schedule. A reply that lands after a
 * sign-out throws instead, so neither the store nor the screen that asked acts
 * on it for the next member. A refusal refreshes too, since the phone's copy
 * may be out of date.
 */
async function mutate<T>(send: () => Promise<T>, apply: (reply: T) => void): Promise<T> {
  const started = session;
  let reply: T;
  try {
    reply = await send();
  } catch (e) {
    if (e instanceof ApiError) void refreshSchedule();
    throw e;
  }
  if (session !== started) throw new Error("Αποσυνδέθηκες.");
  apply(reply);
  void refreshSchedule();
  return reply;
}

/** Saves the member's own details and shows them straight away. */
export async function saveProfile(
  details: Pick<Profile, "first_name" | "last_name" | "phone" | "date_of_birth">,
): Promise<void> {
  await mutate(
    () => api<Profile>("/api/user-profile", { method: "PATCH", body: details }),
    (profile) => set({ profile }),
  );
}

/** Switches the account to the new email address, with the code that was sent to it. */
export async function confirmEmail(code: string): Promise<void> {
  await mutate(
    () => api<EmailReply>("/api/user-profile/email/confirm", { body: { code } }),
    ({ email }) => {
      if (state.profile) set({ profile: { ...state.profile, email } });
    },
  );
}

function patch(classId: string, change: (c: MemberClass) => MemberClass) {
  set({ classes: state.classes?.map((c) => (c.id === classId ? change(c) : c)) ?? null });
}

/**
 * Books a class. With no coverage the server asks first: this returns its
 * message and books nothing until called again with `confirmUnpaid`.
 */
export async function bookClass(
  classId: string,
  confirmUnpaid: boolean,
): Promise<{ confirm: string } | null> {
  try {
    await mutate(
      () => api<BookReply>("/api/bookings", { body: { classId, confirm: confirmUnpaid } }),
      ({ id }) =>
        patch(classId, (c) => ({ ...c, booked: c.booked + 1, my_booking: { id, status: "booked" } })),
    );
    return null;
  } catch (e) {
    if (e instanceof ApiError && (e.body as BookRefusal | null)?.confirm) return { confirm: e.message };
    throw e;
  }
}

/** Cancels a booking. Returns what the member still owes, if anything. */
export async function cancelClass(classId: string, bookingId: string): Promise<string | null> {
  const reply = await mutate(
    () => api<CancelReply>("/api/bookings/" + bookingId, { method: "DELETE" }),
    () => patch(classId, (c) => ({ ...c, booked: Math.max(0, c.booked - 1), my_booking: null })),
  );
  return reply.notice ?? null;
}

/** Checks in to a booking. */
export async function checkInClass(classId: string, bookingId: string): Promise<void> {
  await mutate(
    () => api(`/api/bookings/${bookingId}/check-in`, { method: "POST" }),
    () => patch(classId, (c) => ({ ...c, my_booking: { id: bookingId, status: "checked_in" } })),
  );
}

onSignOut(() => {
  session += 1;
  etag = null;
  cacheRead = false;
  again = false;
  if (cache?.exists) cache.delete();
  set({ classes: null, memberships: null, profile: null, refreshing: false, error: null });
});
