import { useEffect, useState } from "react";

// Seconds left before something is allowed again, e.g. "Send a new code" (the API allows one a minute).
// Counts down one second at a time to 0. setLeft(60) starts a new count.
export function useCountdown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return [left, setLeft] as const;
}
