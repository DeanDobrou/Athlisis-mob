import { getToken, sessionToken, signOut } from "@/lib/session";

const baseUrl = process.env.EXPO_PUBLIC_API_URL;
const SOMETHING_WENT_WRONG = "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
const TIMEOUT_MS = 20_000;

/** A refused or failed request, with the message and reply body from the server. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown = null,
  ) {
    super(message);
  }
}

type Options = {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

/**
 * Sends a request with the signed-in token, or the one given. Throws ApiError
 * with the message from the server for anything but a success or a 304. A 401
 * signs out and shows that message at sign-in, if the token it sent is still
 * the one the session uses.
 */
async function request(path: string, options: Options = {}) {
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not set. Add it to .env.local.");
  }

  const token = options.token ?? getToken();
  const hasBody = options.body !== undefined;

  // Android never gives up on a stalled connection by itself.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  let data: unknown;
  try {
    response = await fetch(baseUrl + path, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      headers: {
        ...options.headers,
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    data = await response.json().catch(() => null);
    // On web the timeout can also cut off the reply itself.
    if (controller.signal.aborted) throw new Error("timed out");
  } catch {
    throw new ApiError(0, "Δεν υπάρχει σύνδεση. Έλεγξε το ίντερνετ και δοκίμασε ξανά.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok && response.status !== 304) {
    const reply = (data as { error?: unknown } | null)?.error;
    const message = typeof reply === "string" ? reply : SOMETHING_WENT_WRONG;
    // Not for a token the session has moved on from: one a password change
    // replaced, or a first-password token from a step the member backed out of.
    if (response.status === 401 && token && token === sessionToken()) {
      await signOut(message);
    }
    throw new ApiError(response.status, message, data);
  }

  return { response, data };
}

/** The message to show for a failed call: the server's own, or a general one. */
export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : SOMETHING_WENT_WRONG;
}

/** Calls the gym API and returns the JSON reply. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  return (await request(path, options)).data as T;
}

/** Fetches `path` unless it still matches `etag`. Null means nothing changed. */
export async function apiIfChanged<T>(
  path: string,
  etag: string | null,
): Promise<{ data: T; etag: string | null } | null> {
  const { response, data } = await request(path, {
    headers: etag ? { "If-None-Match": etag } : {},
  });
  if (response.status === 304) return null;
  return { data: data as T, etag: response.headers.get("etag") };
}
