import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

export type Session =
  | { status: "loading" }
  | { status: "signedOut"; notice?: string }
  | { status: "setPassword"; setPasswordToken: string }
  | { status: "signedIn"; token: string };

const TOKEN_KEY = "session.token";

// ponytail: browsers have no keychain, so web keeps the token in localStorage. Fine for previewing, not for a real web release.
const store: Pick<
  typeof SecureStore,
  "getItemAsync" | "setItemAsync" | "deleteItemAsync"
> =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key) => localStorage.getItem(key),
        setItemAsync: async (key, value) => localStorage.setItem(key, value),
        deleteItemAsync: async (key) => localStorage.removeItem(key),
      }
    : SecureStore;

let session: Session = { status: "loading" };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const signOutListeners = new Set<() => void>();

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
    if (Platform.OS !== "web") {
      const installed = new File(Paths.document, "installed");
      if (!installed.exists) {
        await store.deleteItemAsync(TOKEN_KEY);
        installed.create();
      }
    }

    try {
      const token = await store.getItemAsync(TOKEN_KEY);
      set(token ? { status: "signedIn", token } : { status: "signedOut" });
    } catch {
      await store.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ status: "signedOut" });
    }
  })();
  return loading;
}

/** Stores the token and signs in. */
export async function signIn(token: string): Promise<void> {
  await store.setItemAsync(TOKEN_KEY, token);
  set({ status: "signedIn", token });
}

/** Holds the short-lived token that can only choose a first password. It is never stored. */
export function startSetPassword(setPasswordToken: string) {
  set({ status: "setPassword", setPasswordToken });
}

/** Deletes the stored token and signs out, with an optional message for the sign-in screen. */
export async function signOut(notice?: string): Promise<void> {
  await store.deleteItemAsync(TOKEN_KEY);
  set({ status: "signedOut", notice });
  signOutListeners.forEach((listener) => listener());
}

/** Runs `listener` on every sign-out, to clear data that belonged to that member. */
export function onSignOut(listener: () => void) {
  signOutListeners.add(listener);
}
