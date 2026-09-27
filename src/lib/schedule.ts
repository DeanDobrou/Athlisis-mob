import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import { apiIfChanged, ApiError } from "@/lib/api";
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

/** Fetches the schedule unless the stored copy is still current. */
export async function refreshSchedule(): Promise<void> {
  if (state.refreshing) return;
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
}

onSignOut(() => {
  etag = null;
  cacheRead = false;
  if (cache.exists) cache.delete();
  set({ classes: null, refreshing: false, error: null });
});
