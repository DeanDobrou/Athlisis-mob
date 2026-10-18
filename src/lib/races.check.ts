// Run: npx tsx --import ./scripts/native-stubs.mjs src/lib/races.check.ts
//
// Replays late server replies around sign-outs and password changes. A fake
// network holds every request until the check answers it, so each race happens
// in exactly the order that causes it.
import { api } from "@/lib/api";
import type { MemberClass } from "@/lib/contract";
import { bookClass, refreshSchedule, saveProfile, useSchedule } from "@/lib/schedule";
import { signIn, signOut, startSetPassword, useSession } from "@/lib/session";

type Call = {
  path: string;
  token: string | null;
  reply: (status: number, body?: unknown) => void;
};
const waiting: Call[] = [];

globalThis.fetch = ((url: string, init: RequestInit = {}) =>
  new Promise<Response>((resolve, reject) => {
    init.signal?.addEventListener("abort", reject);
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
    waiting.push({
      path: url.replace(process.env.EXPO_PUBLIC_API_URL ?? "", ""),
      token: auth?.replace("Bearer ", "") ?? null,
      reply: (status, body = {}) =>
        resolve(new Response(status === 304 ? null : JSON.stringify(body), { status })),
    });
  })) as typeof fetch;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The request waiting on `path`, once it has been sent. */
async function take(path: string): Promise<Call> {
  for (let i = 0; i < 50; i++) {
    const index = waiting.findIndex((call) => call.path === path);
    if (index !== -1) return waiting.splice(index, 1)[0];
    await tick();
  }
  throw new Error(`no request to ${path} was sent`);
}

/** Settles a promise into what happened to it, for checks that expect a refusal. */
const outcome = (p: Promise<unknown>) => p.then(() => "done", (e: Error) => e.message);

const klass = (id: string): MemberClass => ({
  id,
  day: "2026-10-12",
  start_time: "18:00",
  end_time: "19:00",
  capacity: 12,
  status: "scheduled",
  is_past: false,
  types: [],
  booked: 5,
  my_booking: null,
});

async function loadClasses(classes: MemberClass[]) {
  const refresh = refreshSchedule();
  (await take("/api/sync")).reply(200, { classes });
  await refresh;
}

async function fresh(token: string) {
  await signOut();
  waiting.length = 0;
  await signIn(token);
}

const scenarios: [string, () => Promise<string | null>][] = [
  [
    "a profile reply after sign-out does not reach the next member",
    async () => {
      await fresh("anna");
      const saving = saveProfile({ first_name: "Anna", last_name: "A", phone: "6900000001", date_of_birth: null });
      await tick();
      await signOut();
      await signIn("babis");
      (await take("/api/user-profile")).reply(200, { email: "anna@gym.gr", first_name: "Anna" });
      await outcome(saving);
      const profile = useSchedule().profile;
      return profile === null ? null : `member B sees ${profile.email}`;
    },
  ],
  [
    "a booking reply after sign-out does not mark the next member's class",
    async () => {
      await fresh("anna");
      await loadClasses([klass("x")]);
      const booking = bookClass("x", false);
      await tick();
      await signOut();
      await signIn("babis");
      await loadClasses([klass("x")]);
      (await take("/api/bookings")).reply(200, { id: "anna-booking" });
      await outcome(booking);
      const mine = useSchedule().classes?.[0].my_booking;
      return mine === null ? null : `member B's class shows booking ${mine?.id}`;
    },
  ],
  [
    "a password change during a refresh does not freeze the schedule",
    async () => {
      await fresh("anna");
      const refresh = refreshSchedule();
      await tick();
      await signIn("anna-new-password");
      (await take("/api/sync")).reply(200, { classes: [klass("y")] });
      await refresh;
      if (useSchedule().refreshing) return "still marked as refreshing";
      const next = refreshSchedule();
      const call = await take("/api/sync").catch(() => null);
      if (!call) return "the next refresh sent no request";
      call.reply(304);
      await next;
      return call.token === "anna-new-password" ? null : `the next refresh used token ${call.token}`;
    },
  ],
  [
    "a 401 on a token a password change replaced retries instead of signing out",
    async () => {
      await fresh("anna");
      const refresh = refreshSchedule();
      await tick();
      await signIn("anna-new-password");
      (await take("/api/sync")).reply(401, { error: "Η σύνδεση έληξε." });
      const retry = await take("/api/sync").catch(() => null);
      retry?.reply(304);
      await refresh;
      if (useSession().status !== "signedIn") return "the member was signed out";
      if (!retry) return "no retry with the new token";
      if (useSchedule().error) return `shows the error "${useSchedule().error}"`;
      return retry.token === "anna-new-password" ? null : `retried with token ${retry.token}`;
    },
  ],
  [
    "a late 401 from a first-password step backed out of leaves the next member signed in",
    async () => {
      await fresh("anna");
      await signOut();
      startSetPassword("first-password");
      const choosing = api("/api/auth/set-password", { body: { newPassword: "x" }, token: "first-password" });
      await tick();
      await signOut();
      await signIn("babis");
      (await take("/api/auth/set-password")).reply(401, { error: "Η σύνδεση έληξε." });
      await outcome(choosing);
      return useSession().status === "signedIn" ? null : "member B was signed out";
    },
  ],
  [
    "a 401 on the first-password step still in use signs out",
    async () => {
      await signOut();
      startSetPassword("first-password");
      const choosing = api("/api/auth/set-password", { body: { newPassword: "x" }, token: "first-password" });
      (await take("/api/auth/set-password")).reply(401, { error: "Η σύνδεση έληξε." });
      await outcome(choosing);
      return useSession().status === "signedOut" ? null : "stayed on the first-password step";
    },
  ],
  [
    "a request the server never answers gives up instead of freezing the schedule",
    async () => {
      await fresh("anna");
      // Holds back the request timeout so the check can run it out at once.
      const realSetTimeout = globalThis.setTimeout;
      const timeouts: (() => void)[] = [];
      globalThis.setTimeout = ((fn: () => void, ms?: number) =>
        ms ? timeouts.push(fn) : realSetTimeout(fn)) as unknown as typeof setTimeout;
      const refresh = refreshSchedule();
      await take("/api/sync").finally(() => (globalThis.setTimeout = realSetTimeout));
      timeouts.forEach((run) => run());
      await tick();
      if (useSchedule().refreshing) return "still marked as refreshing";
      await refresh;
      return useSchedule().error ? null : "showed no error";
    },
  ],
];

void (async () => {
  let failed = 0;
  for (const [name, run] of scenarios) {
    const problem = await run().catch((e: Error) => `crashed: ${e.message}`);
    console.log(`${problem ? "FAIL" : "ok  "} ${name}${problem ? ` (${problem})` : ""}`);
    if (problem) failed++;
  }
  if (failed) process.exitCode = 1;
})();
