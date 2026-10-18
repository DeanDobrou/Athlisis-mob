/**
 * What the gym server sends, as this app reads it. Kept by hand in step with
 * the server (crossfit-gym-app): each type names the one it copies, so a
 * change there has one place to land here. Fields the app never reads are
 * left out.
 */

/** lib/class-sessions.ts SessionType. */
export type ClassType = { id: string; name: string; color_hex: string | null };

/** A booking that holds a place: lib/bookings.ts HOLDS_A_PLACE. */
export type Booking = { id: string; status: "booked" | "checked_in" | "no_show" };

/** lib/class-sessions.ts MemberClass. */
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
  my_booking: Booking | null;
};

/** lib/memberships.ts MemberMembership. */
export type Membership = {
  id: string;
  plan_name: string;
  starts_on: string;
  ends_on: string | null;
  visits_remaining: number | null;
  owed_cents: number | null;
};

/** lib/memberships.ts MemberPastMembership: a paid membership that is over. */
export type PastMembership = {
  id: string;
  plan_name: string;
  starts_on: string;
  ends_on: string | null;
  amount_cents: number;
  method: "cash" | "pos_terminal" | "other";
  paid_on: string;
};

/** lib/members.ts Member, as the member sees their own. */
export type Profile = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
};

/** GET /api/sync. An older server leaves memberships and profile out. */
export type SyncData = {
  classes: MemberClass[];
  memberships?: Membership[];
  profile?: Profile;
};

/** GET /api/user-profile/memberships: one page of history. */
export type HistoryPage = { memberships: PastMembership[]; next: string | null };

/** POST /api/auth/login: signed in, or a first password to choose. */
export type LoginReply = { token: string } | { setPasswordToken: string };

/** The replies that sign in: set-password, reset-password, a password change. */
export type TokenReply = { token: string };

/** POST /api/user-profile/email/confirm: the address the account now uses. */
export type EmailReply = { email: string };

/** POST /api/bookings. */
export type BookReply = { id: string };

/** POST /api/bookings refuses with this; `confirm` asks to book on an unpaid membership. */
export type BookRefusal = { error: string; confirm?: true; amountCents?: number };

/** DELETE /api/bookings/:id. `notice` says what the member still owes. */
export type CancelReply = { notice?: string };
