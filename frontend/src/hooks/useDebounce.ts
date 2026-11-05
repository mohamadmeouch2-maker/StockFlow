import { useEffect, useState } from "react";

// Returns `value`, but only after it has stopped changing for `delayMs`.
// The search box uses it so we don't load products on every key press.
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer); // a new key press cancels the old timer
  }, [value, delayMs]);

  return debounced;
}
