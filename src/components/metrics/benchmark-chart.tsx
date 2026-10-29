'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { BenchmarkReport } from '@/features/metrics/api';

const WIDTH = 640;
const LABEL_W = 132;
const BAR_H = 22;
const GAP = 8;
const GROUP_GAP = 30;
const TITLE_H = 22;

interface Bar {
  label: string;
  value: number;
  className: string;
}

/**
 * Hand-made SVG (no chart library): for the latest run, duration and server
 * blocking of the main thread against the worker pool. Each group has its own
 * scale; every bar carries its value as text, so color is never the only cue.
 */
export function BenchmarkChart({ run }: { run: BenchmarkReport }) {
  const t = useTranslations('Metrics.benchmark');
  const metrics = useTranslations('Metrics');
  const format = useFormatter();
  const ms = (value: number) =>
    metrics('ms', { value: format.number(value, { maximumFractionDigits: 1 }) });

  const groups: { title: string; bars: Bar[] }[] = [
    {
      title: t('chartDuration'),
      bars: [
        {
          label: t('mainThread'),
          value: run.mainThread.durationMs,
          className: 'fill-critical-500',
        },
        { label: t('workerPool'), value: run.workerPool.durationMs, className: 'fill-brand-500' },
      ],
    },
    {
      title: t('chartBlocked'),
      bars: [
        {
          label: t('mainThread'),
          value: run.mainThread.probe.maxDriftMs,
          className: 'fill-critical-500',
        },
        {
          label: t('workerPool'),
          value: run.workerPool.probe.maxDriftMs,
          className: 'fill-brand-500',
        },
      ],
    },
  ];
  const groupH = TITLE_H + 2 * BAR_H + GAP;
  const height = groups.length * groupH + (groups.length - 1) * GROUP_GAP;
  const plotW = WIDTH - LABEL_W - 96;

  return (
    <figure>
      <figcaption className="text-sm font-semibold">{t('chartTitle')}</figcaption>
      <svg
        viewBox={`0 0 ${String(WIDTH)} ${String(height)}`}
        className="mt-3 w-full"
        role="img"
        aria-label={groups
          .map(
            (group) =>
              `${group.title}: ${group.bars.map((b) => `${b.label} ${ms(b.value)}`).join(', ')}`,
          )
          .join('. ')}
      >
        {groups.map((group, g) => {
          const top = g * (groupH + GROUP_GAP);
          const max = Math.max(...group.bars.map((bar) => bar.value), 1);
          return (
            <g key={group.title} transform={`translate(0 ${String(top)})`}>
              <text x={0} y={14} className="fill-foreground text-[13px] font-semibold">
                {group.title}
              </text>
              {group.bars.map((bar, b) => {
                const y = TITLE_H + b * (BAR_H + GAP);
                const w = Math.max(2, (bar.value / max) * plotW);
                return (
                  <g key={bar.label}>
                    <text x={0} y={y + 15} className="fill-muted text-[12px]">
                      {bar.label}
                    </text>
                    <rect
                      x={LABEL_W}
                      y={y}
                      width={plotW}
                      height={BAR_H}
                      rx={6}
                      className="fill-surface-muted"
                    />
                    <rect
                      x={LABEL_W}
                      y={y}
                      width={w}
                      height={BAR_H}
                      rx={6}
                      className={bar.className}
                    />
                    <text
                      x={LABEL_W + w + 8}
                      y={y + 15}
                      className="fill-foreground text-[12px] font-semibold tabular-nums"
                    >
                      {ms(bar.value)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
