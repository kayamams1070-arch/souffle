import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Current timestamp refreshed every `intervalMs` while the app is in the foreground.
 * Timers and counters derive their values from this reference instant, so they never drift
 * when the app goes to the background and comes back.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      setNow(Date.now());
      if (timer) clearInterval(timer);
      timer = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}
