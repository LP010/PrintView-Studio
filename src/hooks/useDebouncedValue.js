import { useEffect, useState } from 'react';

export function useDebouncedValue(value, delay = 150, flushKey = '') {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    setDebounced(value);
  }, [flushKey, value]);

  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return undefined;
    }

    const timer = window.setTimeout(() => setDebounced(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  if (delay <= 0) {
    return value;
  }

  return debounced;
}
