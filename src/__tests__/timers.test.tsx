import { act, renderHook } from '@testing-library/react-native';
import { useCountdown } from '@/hooks/useCountdown';
import {
  SOS_BREATHING_SECONDS,
  SOS_WORKOUT_SECONDS,
  CRAVING_SURF_SECONDS,
} from '@/utils/constants';

/**
 * Timers are derived from wall-clock timestamps. These tests move the system clock the
 * way a backgrounded app experiences it (no interval ticks while asleep).
 */
describe('useCountdown (SOS timers)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 10, 12, 0, 0));
  });
  afterEach(() => jest.useRealTimers());

  it('uses the durations of the brief (2 min, 5 min, 3 min)', () => {
    expect(SOS_BREATHING_SECONDS).toBe(120);
    expect(SOS_WORKOUT_SECONDS).toBe(300);
    expect(CRAVING_SURF_SECONDS).toBe(180);
  });

  it('starts, counts down and finishes once', async () => {
    const onFinish = jest.fn();
    const { result } = await renderHook(() => useCountdown(120, onFinish));
    await act(() => result.current.start());
    await act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(Math.round(result.current.remainingSeconds)).toBe(90);
    expect(result.current.running).toBe(true);
    await act(() => {
      jest.advanceTimersByTime(95_000);
    });
    expect(result.current.finished).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('pauses and resumes without losing or adding time', async () => {
    const { result } = await renderHook(() => useCountdown(120));
    await act(() => result.current.start());
    await act(() => {
      jest.advanceTimersByTime(20_000);
    });
    await act(() => result.current.pause());
    await act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(Math.round(result.current.remainingSeconds)).toBe(100);
    expect(result.current.running).toBe(false);
    await act(() => result.current.resume());
    await act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(Math.round(result.current.remainingSeconds)).toBe(90);
    expect(Math.round(result.current.activeMs / 1000)).toBe(30);
  });

  it('stays exact after a long gap without ticks (app in background)', async () => {
    const { result } = await renderHook(() => useCountdown(300));
    await act(() => result.current.start());
    // Simulate 4 minutes asleep: the clock moves but no interval fires.
    await act(() => {
      jest.setSystemTime(new Date(2026, 3, 10, 12, 4, 0));
      jest.advanceTimersByTime(250);
    });
    expect(Math.round(result.current.remainingSeconds)).toBe(60);
  });

  it('can be reset to a new duration', async () => {
    const { result } = await renderHook(() => useCountdown(30));
    await act(() => result.current.start());
    await act(() => {
      jest.advanceTimersByTime(10_000);
    });
    await act(() => result.current.reset(45));
    expect(result.current.totalSeconds).toBe(45);
    expect(result.current.remainingSeconds).toBe(45);
    expect(result.current.running).toBe(false);
  });
});
