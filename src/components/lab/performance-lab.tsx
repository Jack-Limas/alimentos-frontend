'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { buildProposal, createStrategy } from '@/features/distribution/engine';
import {
  approximateInp,
  labExport,
  longestFrame,
  longTaskStats,
  type LabRun,
} from '@/features/distribution/lab-metrics';
import {
  generateSnapshot,
  SYNTHETIC_DEFAULT_SEED,
  SYNTHETIC_MAX_ORDERS,
  SYNTHETIC_MIN_ORDERS,
} from '@/features/distribution/synthetic';
import { useEngineWorker } from '@/features/distribution/use-engine-worker';
import { useClientValue } from '@/hooks/use-client-value';

/** Event entries for clicks made during a blocked run are delivered after it: wait for them. */
const SETTLE_MS = 400;

interface TimedEntry {
  startTime: number;
  duration: number;
  interactionId?: number;
}

/** Whether this browser reports the given PerformanceObserver entry type. */
function observes(type: 'longtask' | 'event'): boolean {
  return (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.includes(type)
  );
}

const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

export function PerformanceLab() {
  const t = useTranslations('Lab');
  const format = useFormatter();
  const engine = useEngineWorker();
  const [size, setSize] = useState(10_000);
  const [seed, setSeed] = useState(SYNTHETIC_DEFAULT_SEED);
  const [running, setRunning] = useState<LabRun['mode'] | null>(null);
  const [runs, setRuns] = useState<LabRun[]>([]);
  const [clicks, setClicks] = useState(0);
  const supportsLongTask = useClientValue(() => observes('longtask'), true);
  const supportsEvent = useClientValue(() => observes('event'), true);
  const supported = { longtask: supportsLongTask, event: supportsEvent };

  // Deterministic data: the same size and seed always give the same snapshot.
  const snapshot = useMemo(() => generateSnapshot({ orders: size, seed }), [size, seed]);

  const wheel = useRef<HTMLSpanElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const frames = useRef<number[]>([]);
  const lastFrame = useRef(0);
  const recording = useRef(false);
  const longTasks = useRef<TimedEntry[]>([]);
  const events = useRef<TimedEntry[]>([]);
  // Fallback when the browser reports no "event" entries (e.g. headless Chrome, which
  // never presents a frame): how long each click waited before its handler ran.
  const clickDelays = useRef<TimedEntry[]>([]);

  // The indicator is moved by JavaScript on every requestAnimationFrame, NOT by a CSS
  // animation: CSS transform animations run on the compositor thread and keep spinning
  // while the main thread is blocked, so they would hide the freeze this demo shows.
  useEffect(() => {
    let id = 0;
    let count = 0;
    const loop = (time: number) => {
      count += 1;
      lastFrame.current = time;
      if (recording.current) frames.current.push(time);
      if (wheel.current) wheel.current.style.transform = `rotate(${String((time / 4) % 360)}deg)`;
      if (counter.current) counter.current.textContent = t('indicator.frames', { count });
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [t]);

  useEffect(() => {
    const observers: PerformanceObserver[] = [];
    if (observes('longtask')) {
      const observer = new PerformanceObserver((list) => {
        longTasks.current.push(...list.getEntries());
      });
      observer.observe({ type: 'longtask' });
      observers.push(observer);
    }
    if (observes('event')) {
      const observer = new PerformanceObserver((list) => {
        events.current.push(...(list.getEntries() as TimedEntry[]));
      });
      // durationThreshold 16: every interaction that takes at least one frame.
      observer.observe({ type: 'event', durationThreshold: 16 } as PerformanceObserverInit);
      observers.push(observer);
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  async function run(mode: LabRun['mode']) {
    setRunning(mode);
    setClicks(0);
    // Let React paint the "running" state and the indicator spin before measuring.
    await nextFrame();
    await nextFrame();
    // Start in a task of its own, so the browser attributes the work as one long task.
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    // Keep the last painted frame: the freeze is measured from it.
    frames.current = [lastFrame.current];
    clickDelays.current = [];
    recording.current = true;
    const start = performance.now();
    let engineMs = 0;
    try {
      if (mode === 'main') {
        // Synchronous on purpose: this is what freezes the page.
        engineMs = buildProposal(snapshot, createStrategy('BALANCED')).summary.processingMs;
      } else {
        const outcome = await engine.run(
          { snapshot, strategy: 'BALANCED', detail: 'summary', top: 10, progressEvery: 1_000 },
          { channel: 'lab' },
        );
        if (outcome.status === 'done') engineMs = outcome.durationMs;
      }
    } finally {
      const end = performance.now();
      await new Promise((resolve) => window.setTimeout(resolve, SETTLE_MS));
      recording.current = false;
      const frame = longestFrame(frames.current, start, end);
      const tasks = longTaskStats(longTasks.current, start, end);
      setRuns((current) => [
        ...current,
        {
          id: current.length + 1,
          mode,
          orders: snapshot.orders.length,
          seed,
          durationMs: Math.round((end - start) * 10) / 10,
          engineMs: Math.round(engineMs * 10) / 10,
          longestFrameMs: frame.longestFrameMs,
          frames: frame.frames,
          longTasks: tasks.count,
          longTasksMs: tasks.totalMs,
          inpMs: round1(
            approximateInp(events.current, start, end) ??
              approximateInp(clickDelays.current, start, end),
          ),
          startedAt: new Date().toISOString(),
        },
      ]);
      setRunning(null);
    }
  }

  function exportJson() {
    const environment = {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      crossOriginIsolated: window.crossOriginIsolated,
      supported,
    };
    const blob = new Blob([labExport(runs, environment)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alimentaiq-lab-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const ms = (value: number | null) =>
    value === null ? t('results.none') : t('results.ms', { value });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-berry-700 dark:text-berry-300">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t('intro')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-5 rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <label className="block">
              <span className="flex justify-between text-sm font-semibold">
                {t('size')}
                <output className="tabular-nums">{t('sizeValue', { count: size })}</output>
              </span>
              <input
                type="range"
                min={SYNTHETIC_MIN_ORDERS}
                max={SYNTHETIC_MAX_ORDERS}
                step={1_000}
                value={size}
                disabled={running !== null}
                onChange={(event) => setSize(Number(event.target.value))}
                className="mt-3 w-full accent-[var(--color-berry-600)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">{t('seed')}</span>
              <input
                type="number"
                value={seed}
                disabled={running !== null}
                onChange={(event) => setSeed(Number(event.target.value) || 0)}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          <p className="text-sm text-muted">
            {t('snapshot', {
              orders: snapshot.orders.length,
              products: snapshot.products.length,
              lots: snapshot.lots.length,
            })}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              size="lg"
              disabled={running !== null}
              onClick={() => void run('main')}
            >
              {running === 'main' ? t('running') : t('runMain')}
            </Button>
            <Button
              variant="lagoon"
              size="lg"
              disabled={running !== null}
              onClick={() => void run('worker')}
            >
              {running === 'worker' ? t('running') : t('runWorker')}
            </Button>
          </div>
        </section>

        <section className="flex flex-col items-center justify-center gap-4 rounded-card bg-forest-950 p-6 text-white shadow-card ring-1 ring-forest-800">
          <h2 className="font-display text-lg font-semibold">{t('indicator.title')}</h2>
          <div className="relative size-32">
            <span
              ref={wheel}
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-[10px] border-forest-800 border-t-expiry-300 border-r-berry-400"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <Icon name="truck" className="size-9 text-expiry-200" />
            </span>
          </div>
          <span ref={counter} className="font-display text-sm tabular-nums text-forest-100" />
          <p className="max-w-xs text-center text-xs text-forest-200">{t('indicator.hint')}</p>
          <Button
            variant="citrus"
            onClick={(event) => {
              clickDelays.current.push({
                startTime: event.timeStamp,
                duration: performance.now() - event.timeStamp,
                interactionId: 1,
              });
              setClicks((count) => count + 1);
            }}
          >
            {t('clickMe')}
          </Button>
          <p role="status" className="text-sm font-semibold tabular-nums">
            {t('clicks', { count: clicks })}
          </p>
        </section>
      </div>

      <section className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{t('results.title')}</h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Icon name="out" className="size-4" />}
              disabled={runs.length === 0}
              onClick={exportJson}
            >
              {t('results.export')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={runs.length === 0}
              onClick={() => setRuns([])}
            >
              {t('results.clear')}
            </Button>
          </div>
        </div>
        {runs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t('results.empty')}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">{t('results.mode')}</th>
                  <th className="py-2 pr-3 text-right">{t('results.orders')}</th>
                  <th className="py-2 pr-3 text-right">{t('results.duration')}</th>
                  <th className="py-2 pr-3 text-right">{t('results.engine')}</th>
                  <th className="py-2 pr-3 text-right">{t('results.longestFrame')}</th>
                  <th className="py-2 pr-3 text-right">{t('results.longTasks')}</th>
                  <th className="py-2 text-right">{t('results.inp')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {runs.map((entry) => (
                  <tr key={entry.id} data-mode={entry.mode}>
                    <td className="py-2 pr-3 text-muted">{entry.id}</td>
                    <td className="py-2 pr-3 font-semibold">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${
                          entry.mode === 'main'
                            ? 'bg-critical-100 text-critical-700 ring-critical-200 dark:bg-critical-900/40 dark:text-critical-200 dark:ring-critical-800'
                            : 'bg-lagoon-100 text-lagoon-800 ring-lagoon-200 dark:bg-lagoon-900/40 dark:text-lagoon-200 dark:ring-lagoon-800'
                        }`}
                      >
                        {t(`results.modes.${entry.mode}`)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">{format.number(entry.orders)}</td>
                    <td className="py-2 pr-3 text-right">{ms(entry.durationMs)}</td>
                    <td className="py-2 pr-3 text-right">{ms(entry.engineMs)}</td>
                    <td className="py-2 pr-3 text-right font-semibold">
                      {ms(entry.longestFrameMs)}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {supported.longtask
                        ? t('results.longTasksValue', {
                            count: entry.longTasks,
                            ms: entry.longTasksMs,
                          })
                        : t('results.none')}
                    </td>
                    <td className="py-2 text-right">{ms(entry.inpMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer font-semibold text-foreground">
            {t('notes.title')}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t('notes.duration')}</li>
            <li>{t('notes.frame')}</li>
            <li>{t('notes.longTasks')}</li>
            <li>{t('notes.inp')}</li>
            {!supported.longtask || !supported.event ? <li>{t('notes.unsupported')}</li> : null}
          </ul>
        </details>
      </section>
    </div>
  );
}
