/** What one lab run measured (all times in milliseconds). */
export interface LabRun {
  id: number;
  mode: 'main' | 'worker' | 'pool';
  /** Threads that computed: 0 = main thread, 1 = one worker, N = the pool. */
  workers: number;
  /** Stopped with Cancel before the end. */
  cancelled: boolean;
  orders: number;
  seed: number;
  /** Click → result, as the user waits for it. */
  durationMs: number;
  /** Engine time only (processingMs of the plan). */
  engineMs: number;
  /** Largest gap between two requestAnimationFrame callbacks during the run. */
  longestFrameMs: number;
  frames: number;
  longTasks: number;
  longTasksMs: number;
  /** Longest interaction on the "click while it computes" button, or null without clicks. */
  inpMs: number | null;
  startedAt: string;
}

/**
 * Longest gap between consecutive frame timestamps during the run. The gap
 * that matters starts at the last frame painted *before* the run (when it is
 * in `timestamps`), not at `start`, so a frozen run shows its full length;
 * `end` closes the window when no frame came after it yet.
 */
export function longestFrame(
  timestamps: readonly number[],
  start: number,
  end: number,
): { longestFrameMs: number; frames: number } {
  const before = timestamps.filter((t) => t < start).at(-1) ?? start;
  const inside = timestamps.filter((t) => t >= start && t <= end);
  const points = [before, ...inside, end];
  let longest = 0;
  for (let i = 1; i < points.length; i += 1) {
    longest = Math.max(longest, (points[i] ?? 0) - (points[i - 1] ?? 0));
  }
  return { longestFrameMs: round1(longest), frames: inside.length };
}

/**
 * Long tasks (PerformanceObserver "longtask") that overlap the window. A task
 * can start a moment before `start` is read inside it, so overlap is used,
 * not "started inside".
 */
export function longTaskStats(
  entries: readonly { startTime: number; duration: number }[],
  start: number,
  end: number,
): { count: number; totalMs: number } {
  const inside = entries.filter(
    (entry) => entry.startTime <= end && entry.startTime + entry.duration >= start,
  );
  return {
    count: inside.length,
    totalMs: round1(inside.reduce((sum, entry) => sum + entry.duration, 0)),
  };
}

/**
 * Approximate INP: the longest "event" entry (durationThreshold 16) that
 * belongs to an interaction (interactionId > 0) inside the window. With few
 * interactions INP is the worst one, so the max is a fair approximation.
 */
export function approximateInp(
  entries: readonly { startTime: number; duration: number; interactionId?: number }[],
  start: number,
  end: number,
): number | null {
  const durations = entries
    .filter(
      (entry) =>
        (entry.interactionId ?? 0) > 0 && entry.startTime >= start && entry.startTime <= end,
    )
    .map((entry) => entry.duration);
  return durations.length === 0 ? null : Math.max(...durations);
}

/** JSON the lab exports: environment plus every run, with a fixed shape. */
export function labExport(runs: readonly LabRun[], environment: Record<string, unknown>): string {
  return JSON.stringify(
    { tool: 'alimentaiq-performance-lab', version: 1, environment, runs },
    null,
    2,
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
