import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNow } from './useNow';

export interface Countdown {
  totalSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  /** 0..1 elapsed */
  progress: number;
  running: boolean;
  finished: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (totalSeconds?: number) => void;
  /** Milliseconds actually spent running (excludes pauses). */
  activeMs: number;
}

/**
 * Timestamp-based countdown. Remaining time is derived from the wall clock, so
 * backgrounding the app or a slow JS thread cannot make the countdown drift.
 */
export function useCountdown(initialSeconds: number, onFinish?: () => void): Countdown {
  const [total, setTotal] = useState(initialSeconds);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedAccum, setPausedAccum] = useState(0);
  const now = useNow(250);
  const finishedRef = useRef(false);

  const activeMs = useMemo(() => {
    if (startedAt === null) return 0;
    const end = pausedAt ?? now;
    return Math.max(0, end - startedAt - pausedAccum);
  }, [startedAt, pausedAt, pausedAccum, now]);

  const elapsedSeconds = Math.min(total, activeMs / 1000);
  const remainingSeconds = Math.max(0, total - elapsedSeconds);
  const finished = startedAt !== null && remainingSeconds <= 0;
  const running = startedAt !== null && pausedAt === null && !finished;

  useEffect(() => {
    if (finished && !finishedRef.current) {
      finishedRef.current = true;
      onFinish?.();
    }
  }, [finished, onFinish]);

  const start = useCallback(() => {
    finishedRef.current = false;
    setStartedAt(Date.now());
    setPausedAt(null);
    setPausedAccum(0);
  }, []);
  const pause = useCallback(() => {
    if (startedAt !== null && pausedAt === null) setPausedAt(Date.now());
  }, [startedAt, pausedAt]);
  const resume = useCallback(() => {
    if (pausedAt !== null) {
      setPausedAccum((acc) => acc + (Date.now() - pausedAt));
      setPausedAt(null);
    }
  }, [pausedAt]);
  const reset = useCallback((seconds?: number) => {
    finishedRef.current = false;
    if (seconds !== undefined) setTotal(seconds);
    setStartedAt(null);
    setPausedAt(null);
    setPausedAccum(0);
  }, []);

  return {
    totalSeconds: total,
    remainingSeconds,
    elapsedSeconds,
    progress: total > 0 ? elapsedSeconds / total : 1,
    running,
    finished,
    start,
    pause,
    resume,
    reset,
    activeMs,
  };
}
