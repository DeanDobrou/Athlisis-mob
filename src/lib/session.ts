import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

export type Session =
  | { status: "loading" }
  | { status: "signedOut"; notice?: string }
  | { status: "setPassword"; setPasswordToken: string }
  | { status: "signedIn"; token: string };

const TOKEN_KEY = "session.token";

let session: Session = { status: "loading" };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Session) {
  session = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current session, re-rendering the component when it changes. */
export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => session);
}

/** The signed-in token, or null. */
export function getToken(): string | null {
  return session.status === "signedIn" ? session.token : null;
}

/**
 * Reads the stored token once at launch. On the first launch after an install
 * it deletes any token first, because the iOS keychain keeps it across
 * uninstalls while the documents folder does not.
 */
export function loadSession(): Promise<void> {
  loading ??= (async () => {
    const installed = new File(Paths.document, "installed");
    if (!installed.exists) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      installed.create();
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      set(token ? { status: "signedIn", token } : { status: "signedOut" });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ status: "signedOut" });
    }
  })();
  return loading;
}

/** Stores the token and signs in. */
export async function signIn(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  set({ status: "signedIn", token });
}

/** Holds the short-lived token that can only choose a first password. It is never stored. */
export function startSetPassword(setPasswordToken: string) {
  set({ status: "setPassword", setPasswordToken });
}

/** Deletes the stored token and signs out, with an optional message for the sign-in screen. */
export async function signOut(notice?: string): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  set({ status: "signedOut", notice });
}
