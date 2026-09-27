import { getToken, signOut } from "@/lib/session";

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

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

/**
 * Calls the gym API with the signed-in token, or the one given, and returns
 * the JSON reply. Throws ApiError with the message from the server. A 401 on
 * a request that sent a token signs out and shows that message at sign-in.
 */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not set. Add it to .env.local.");
  }

  const token = options.token ?? getToken();
  const hasBody = options.body !== undefined;

  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Δεν υπάρχει σύνδεση. Έλεγξε το ίντερνετ και δοκίμασε ξανά.");
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const reply = (data as { error?: unknown } | null)?.error;
    const message =
      typeof reply === "string" ? reply : "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
    if (response.status === 401 && token) await signOut(message);
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
