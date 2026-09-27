import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import { api, apiIfChanged, ApiError } from "@/lib/api";
import { getToken, onSignOut } from "@/lib/session";

export type ClassType = { id: string; name: string; color_hex: string };

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

type ScheduleState = {
  classes: MemberClass[] | null;
  refreshing: boolean;
  error: string | null;
};

const cache = new File(Paths.document, "schedule.json");

let state: ScheduleState = { classes: null, refreshing: false, error: null };
let etag: string | null = null;
let cacheRead = false;
let again = false;
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
  if (!cache.exists) return;
  try {
    const saved = JSON.parse(await cache.text());
    etag = saved.etag ?? null;
    set({ classes: saved.classes });
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
  const token = getToken();
  set({ refreshing: true, error: null });

  try {
    const fresh = await apiIfChanged<{ classes: MemberClass[] }>(
      "/api/sync",
      etag,
    );
    if (getToken() !== token) return;
    if (fresh) {
      etag = fresh.etag;
      cache.create({ overwrite: true });
      cache.write(JSON.stringify({ etag, classes: fresh.data.classes }));
      set({ classes: fresh.data.classes });
    }
    set({ refreshing: false });
  } catch (e) {
    if (getToken() !== token) return;
    set({
      refreshing: false,
      error: e instanceof ApiError ? e.message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
    });
  }

  if (again) {
    again = false;
    await refreshSchedule();
  }
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
    const { id } = await api<{ id: string }>("/api/bookings", {
      body: { classId, confirm: confirmUnpaid },
    });
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
    throw e;
  }
}

/** Cancels a booking. Returns what the member still owes, if anything. */
export async function cancelClass(
  classId: string,
  bookingId: string,
): Promise<string | null> {
  const reply = await api<{ notice?: string }>("/api/bookings/" + bookingId, {
    method: "DELETE",
  });
  patch(classId, (c) => ({
    ...c,
    booked: Math.max(0, c.booked - 1),
    my_booking: null,
  }));
  void refreshSchedule();
  return reply.notice ?? null;
}

onSignOut(() => {
  etag = null;
  cacheRead = false;
  again = false;
  if (cache.exists) cache.delete();
  set({ classes: null, refreshing: false, error: null });
});
