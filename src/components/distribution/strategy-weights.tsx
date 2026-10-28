'use client';

import { useTranslations } from 'next-intl';
import { RULE_STRATEGIES, STRATEGY_WEIGHTS, type Weights } from '@/features/distribution/engine';
import { presetOf, setWeight, WEIGHT_KEYS, type WeightKey } from '@/features/distribution/weights';

const sliderTone: Record<WeightKey, string> = {
  priority: 'accent-[var(--color-berry-600)]',
  deadlineUrgency: 'accent-[var(--color-expiry-500)]',
  expiryPressure: 'accent-[var(--color-lagoon-600)]',
};

const barTone: Record<WeightKey, string> = {
  priority: 'bg-berry-500',
  deadlineUrgency: 'bg-expiry-400',
  expiryPressure: 'bg-lagoon-500',
};

/**
 * Strategy presets plus three sliders that always add up to 100: moving one
 * rebalances the other two (setWeight). A preset is highlighted when the
 * weights match it; otherwise they are "custom".
 */
export function StrategyWeights({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (weights: Weights) => void;
}) {
  const t = useTranslations('Distribution');
  const preset = presetOf(weights);

  return (
    <div className="space-y-4">
      <div role="group" aria-label={t('generate.strategyLabel')} className="flex flex-wrap gap-2">
        {[...RULE_STRATEGIES, 'CUSTOM' as const].map((name) => {
          const pressed = name === 'CUSTOM' ? preset === null : preset === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={pressed}
              disabled={name === 'CUSTOM'}
              onClick={() => {
                if (name !== 'CUSTOM') onChange({ ...STRATEGY_WEIGHTS[name] });
              }}
              title={t(`strategyHints.${name}`)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 motion-reduce:active:scale-100 disabled:cursor-default ${
                pressed
                  ? 'bg-forest-700 text-white shadow-[0_2px_0_0_var(--color-forest-900)] ring-forest-800 dark:bg-forest-500'
                  : 'bg-surface text-muted ring-border hover:text-foreground'
              }`}
            >
              {t(`strategies.${name}`)}
            </button>
          );
        })}
      </div>

      {/* Stacked bar: the three weights at a glance, always 100 wide. */}
      <div
        aria-hidden="true"
        className="flex h-3 overflow-hidden rounded-full bg-surface-muted ring-1 ring-border"
      >
        {WEIGHT_KEYS.map((key) => (
          <span
            key={key}
            className={`${barTone[key]} transition-[width] duration-300 motion-reduce:transition-none`}
            style={{ width: `${String(weights[key])}%` }}
          />
        ))}
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">{t('weights.label')}</legend>
        {WEIGHT_KEYS.map((key) => (
          <label key={key} className="block rounded-2xl bg-surface-muted/60 p-3 ring-1 ring-border">
            <span className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={`size-2.5 rounded-full ${barTone[key]}`} />
                {t(`weights.${key}`)}
              </span>
              <output className="font-display tabular-nums">
                {t('weights.value', { value: weights[key] })}
              </output>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={weights[key]}
              onChange={(event) => onChange(setWeight(weights, key, Number(event.target.value)))}
              className={`mt-2 w-full ${sliderTone[key]}`}
            />
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted">{t('weights.total')}</p>
    </div>
  );
}
