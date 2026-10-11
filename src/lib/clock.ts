import { useEffect, useState } from "react";

/**
 * The current time, updated every 30 seconds, for screens whose buttons depend
 * on it, so check-in appears and cancelling closes without reopening them.
 * Pass it into the time maths: the React Compiler reuses results whose inputs
 * did not change, so a bare re-render would not read the clock again.
 */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Within half a minute of a boundary: plenty for windows set in minutes.
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
