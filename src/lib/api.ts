import { getToken, signOut } from "@/lib/session";

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

/** A refused or failed request, with the server's message and reply body. */
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
 * Calls the gym API with the signed-in member's token and returns the JSON
 * reply. Throws ApiError with the server's message. A 401 on a signed-in
 * request signs the member out.
 */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not set. Add it to .env.local.");
  }

  const token = getToken();
  const hasBody = options.body !== undefined;

  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Δεν υπάρχει σύνδεση. Έλεγξε το ίντερνετ και δοκίμασε ξανά.");
  }

  const data: unknown = await response.json().catch(() => null);

  if (response.status === 401 && token) await signOut();
  if (!response.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new ApiError(
      response.status,
      typeof message === "string" ? message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
      data,
    );
  }

  return data as T;
}
