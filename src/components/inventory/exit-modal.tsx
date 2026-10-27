'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, fieldAria, inputClass, selectClass } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useCreateExit } from '@/features/inventory/api';
import {
  exitFormSchema,
  validateForm,
  type FieldErrors,
  type FormValues,
} from '@/features/inventory/form-validation';
import { mapMutationError, type MutationErrorView } from '@/features/inventory/mutation-errors';
import { MANUAL_EXIT_TYPES, type ManualExitType } from '@/features/inventory/types';
import type { ProductDetail } from '@/features/products/types';
import { calendarDateToUtc } from '@/lib/dates';
import { MutationErrorBanner } from './mutation-error-banner';

type Values = FormValues<typeof exitFormSchema>;

const typeStyle: Record<ManualExitType, string> = {
  EXIT_WASTE:
    'has-[:checked]:border-berry-400 has-[:checked]:bg-berry-50 has-[:checked]:ring-berry-300 dark:has-[:checked]:bg-berry-900/30',
  ADJUSTMENT:
    'has-[:checked]:border-lagoon-400 has-[:checked]:bg-lagoon-50 has-[:checked]:ring-lagoon-300 dark:has-[:checked]:bg-lagoon-900/30',
};

export function ExitForm({ product, onClose }: { product: ProductDetail; onClose: () => void }) {
  const t = useTranslations('StockForms.exit');
  const forms = useTranslations('Forms');
  const units = useTranslations('Catalog.units.short');
  const format = useFormatter();
  const toast = useToast();
  const exit = useCreateExit();
  const [values, setValues] = useState<Values>({
    quantity: '',
    type: 'EXIT_WASTE',
    lotId: '',
    reason: '',
  });
  const [errors, setErrors] = useState<FieldErrors<keyof Values>>({});
  const [failure, setFailure] = useState<MutationErrorView | null>(null);

  const unit = units(product.unit);
  const qty = (value: number) => `${format.number(value, { maximumFractionDigits: 3 })} ${unit}`;
  const set = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === 'quantity' || field === 'lotId' || field === 'type') setFailure(null);
  };
  const errorOf = (field: keyof Values) => {
    const key = errors[field];
    return key ? forms(`errors.${key}`) : undefined;
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const result = validateForm(exitFormSchema, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const { lotId, ...rest } = result.data;
    try {
      await exit.mutateAsync({ productId: product.id, ...rest, ...(lotId ? { lotId } : {}) });
      toast.show(t('done', { quantity: qty(rest.quantity), name: product.name }));
      onClose();
    } catch (error) {
      // 409 INSUFFICIENT_STOCK keeps the form open with the available quantity.
      setFailure(mapMutationError(error));
    }
  }

  const short = failure?.kind === 'insufficientStock';
  const available =
    failure?.kind === 'insufficientStock' && failure.available !== null ? failure.available : null;
  const availableHint =
    values.type === 'EXIT_WASTE' && product.expiredQty > 0
      ? t('availableWithExpired', {
          quantity: qty(product.availableQty),
          expired: qty(product.expiredQty),
        })
      : t('available', { quantity: qty(product.availableQty) });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold">{t('type')}</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {MANUAL_EXIT_TYPES.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer gap-3 rounded-2xl border border-border p-3 ring-1 ring-transparent transition active:scale-[0.98] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring motion-reduce:active:scale-100 ${typeStyle[type]}`}
            >
              <input
                type="radio"
                name="exit-type"
                value={type}
                checked={values.type === type}
                onChange={() => set('type')(type)}
                className="mt-1 accent-current"
              />
              <span>
                <span className="block text-sm font-semibold">{t(`types.${type}.label`)}</span>
                <span className="block text-xs text-muted">{t(`types.${type}.hint`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="exit-quantity"
          label={t('quantity')}
          hint={availableHint}
          error={errorOf('quantity') ?? (short ? ' ' : undefined)}
        >
          <div className="relative">
            <input
              {...fieldAria(
                'exit-quantity',
                errorOf('quantity') ?? (short ? ' ' : undefined),
                availableHint,
              )}
              value={values.quantity}
              onChange={(event) => set('quantity')(event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              className={`${inputClass} pr-14`}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
              {unit}
            </span>
          </div>
        </Field>

        <Field id="exit-lot" label={t('lot')} optional={forms('optional')}>
          <select
            id="exit-lot"
            value={values.lotId}
            onChange={(event) => set('lotId')(event.target.value)}
            className={selectClass}
          >
            <option value="">{t('lotAuto')}</option>
            {product.lots.map((lot) => {
              const code = lot.lotCode ?? lot.id.slice(0, 8);
              return (
                <option key={lot.id} value={lot.id}>
                  {lot.expired
                    ? t('lotExpired', { code, quantity: qty(lot.quantity) })
                    : t('lotOption', {
                        code,
                        quantity: qty(lot.quantity),
                        date: format.dateTime(calendarDateToUtc(lot.expiryDate), {
                          timeZone: 'UTC',
                          day: 'numeric',
                          month: 'short',
                        }),
                      })}
                </option>
              );
            })}
          </select>
        </Field>
      </div>

      <Field id="exit-reason" label={t('reason')} error={errorOf('reason')}>
        <textarea
          {...fieldAria('exit-reason', errorOf('reason'))}
          value={values.reason}
          onChange={(event) => set('reason')(event.target.value)}
          placeholder={t('reasonPlaceholder')}
          rows={2}
          maxLength={500}
          className={`${inputClass} h-auto py-2.5`}
        />
      </Field>

      {failure ? (
        <div className="space-y-2">
          <MutationErrorBanner error={failure} unit={unit} />
          {available !== null && available > 0 ? (
            <Button variant="citrus" size="sm" onClick={() => set('quantity')(String(available))}>
              {forms('useAvailable', { available, unit })}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {forms('cancel')}
        </Button>
        <Button type="submit" variant="danger" disabled={exit.isPending}>
          {exit.isPending ? forms('saving') : t('submit')}
        </Button>
      </div>
    </form>
  );
}

export function ExitModal({
  product,
  open,
  onClose,
}: {
  product: ProductDetail;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('StockForms.exit');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title')}
      description={t('description', { name: product.name })}
    >
      <ExitForm product={product} onClose={onClose} />
    </Modal>
  );
}
