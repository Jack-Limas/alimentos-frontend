'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, fieldAria, inputClass } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useCreateEntry } from '@/features/inventory/api';
import {
  entryFormSchema,
  validateForm,
  type FieldErrors,
  type FormValues,
} from '@/features/inventory/form-validation';
import { mapMutationError, type MutationErrorView } from '@/features/inventory/mutation-errors';
import type { Product } from '@/features/products/types';
import { businessToday, calendarDateToUtc } from '@/lib/dates';
import { MutationErrorBanner } from './mutation-error-banner';

type Values = FormValues<ReturnType<typeof entryFormSchema>>;

function EntryForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useTranslations('StockForms.entry');
  const forms = useTranslations('Forms');
  const units = useTranslations('Catalog.units.short');
  const format = useFormatter();
  const toast = useToast();
  const entry = useCreateEntry();
  const today = businessToday();
  const schema = useMemo(() => entryFormSchema(today), [today]);
  const [values, setValues] = useState<Values>({
    quantity: '',
    expiryDate: '',
    lotCode: '',
    note: '',
  });
  const [errors, setErrors] = useState<FieldErrors<keyof Values>>({});
  const [failure, setFailure] = useState<MutationErrorView | null>(null);

  const set = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const errorOf = (field: keyof Values) => {
    const key = errors[field];
    return key ? forms(`errors.${key}`) : undefined;
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const result = validateForm(schema, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const { lotCode, note, ...rest } = result.data;
    try {
      await entry.mutateAsync({
        productId: product.id,
        ...rest,
        ...(lotCode ? { lotCode } : {}),
        ...(note ? { note } : {}),
      });
      toast.show(
        t('done', {
          quantity: `${format.number(rest.quantity, { maximumFractionDigits: 3 })} ${units(product.unit)}`,
          name: product.name,
        }),
      );
      onClose();
    } catch (error) {
      setFailure(mapMutationError(error));
    }
  }

  const todayLabel = format.dateTime(calendarDateToUtc(today), {
    timeZone: 'UTC',
    dateStyle: 'long',
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="entry-quantity" label={t('quantity')} error={errorOf('quantity')}>
          <div className="relative">
            <input
              {...fieldAria('entry-quantity', errorOf('quantity'))}
              value={values.quantity}
              onChange={(event) => set('quantity')(event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              className={`${inputClass} pr-14`}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
              {units(product.unit)}
            </span>
          </div>
        </Field>
        <Field
          id="entry-expiry"
          label={t('expiryDate')}
          hint={t('expiryHint', { today: todayLabel })}
          error={errorOf('expiryDate')}
        >
          <input
            {...fieldAria(
              'entry-expiry',
              errorOf('expiryDate'),
              t('expiryHint', { today: todayLabel }),
            )}
            type="date"
            min={today}
            value={values.expiryDate}
            onChange={(event) => set('expiryDate')(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        id="entry-lot-code"
        label={t('lotCode')}
        optional={forms('optional')}
        error={errorOf('lotCode')}
      >
        <input
          {...fieldAria('entry-lot-code', errorOf('lotCode'))}
          value={values.lotCode}
          onChange={(event) => set('lotCode')(event.target.value)}
          placeholder={t('lotCodePlaceholder')}
          maxLength={64}
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <Field id="entry-note" label={t('note')} optional={forms('optional')} error={errorOf('note')}>
        <textarea
          {...fieldAria('entry-note', errorOf('note'))}
          value={values.note}
          onChange={(event) => set('note')(event.target.value)}
          rows={2}
          maxLength={500}
          className={`${inputClass} h-auto py-2.5`}
        />
      </Field>

      {failure ? <MutationErrorBanner error={failure} /> : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {forms('cancel')}
        </Button>
        <Button type="submit" disabled={entry.isPending}>
          {entry.isPending ? forms('saving') : t('submit')}
        </Button>
      </div>
    </form>
  );
}

export function EntryModal({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('StockForms.entry');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title')}
      description={t('description', { name: product.name })}
    >
      <EntryForm product={product} onClose={onClose} />
    </Modal>
  );
}
