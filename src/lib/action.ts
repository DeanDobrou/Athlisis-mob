import { useState } from "react";

import { errorMessage } from "@/lib/api";

/**
 * A screen's requests, one at a time: `pending` while one runs, then its error
 * if it failed. A notice set during a run shows until the next one starts. A
 * tap while one is running does nothing.
 */
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<void>): Promise<void> {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    // No `finally`: the React Compiler skips any code that has one.
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
    setPending(false);
  }

  return { pending, error, setError, notice, setNotice, run };
}
