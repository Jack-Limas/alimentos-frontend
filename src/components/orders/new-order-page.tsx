'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState, type FormEvent } from 'react';
import { MutationErrorBanner } from '@/components/inventory/mutation-error-banner';
import { useFormatQuantity } from '@/components/inventory/quantity';
import { StockChip } from '@/components/inventory/status-chips';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Field, inputClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { useCustomers } from '@/features/customers/api';
import { mapMutationError, type MutationErrorView } from '@/features/inventory/mutation-errors';
import { useCreateOrder } from '@/features/orders/api';
import {
  isOrderErrorKey,
  MAX_ORDER_ITEMS,
  validateOrderForm,
  type OrderFormErrorKey,
  type OrderFormErrors,
  type OrderFormValues,
} from '@/features/orders/order-form';
import { ORDER_PRIORITIES, type OrderPriority } from '@/features/orders/types';
import { useActiveProducts } from '@/features/products/api';
import { Link, useRouter } from '@/i18n/navigation';
import { businessToday, calendarDateToUtc } from '@/lib/dates';
import { PriorityBadge } from './order-badges';

const EMPTY_ROW = { productId: '', quantity: '' };

export function NewOrderPage() {
  const t = useTranslations('NewOrder');
  const forms = useTranslations('Forms');
  const meta = useTranslations('OrderMeta');
  const detail = useTranslations('OrderDetail');
  const units = useTranslations('Catalog.units.short');
  const format = useFormatter();
  const formatQuantity = useFormatQuantity();
  const toast = useToast();
  const router = useRouter();
  const create = useCreateOrder();
  const customers = useCustomers('status=ACTIVE&pageSize=100');
  const products = useActiveProducts();
  const today = businessToday();

  const [values, setValues] = useState<OrderFormValues>({
    customerId: '',
    priority: 'MEDIUM',
    dueDate: today,
    notes: '',
    items: [{ ...EMPTY_ROW }],
  });
  const [errors, setErrors] = useState<OrderFormErrors>({ rows: {} });
  const [failure, setFailure] = useState<MutationErrorView | null>(null);

  const message = (key: OrderFormErrorKey | undefined) =>
    key === undefined
      ? undefined
      : isOrderErrorKey(key)
        ? t(`errors.${key}`)
        : forms(`errors.${key}`);

  const customerOptions: ComboboxOption[] = useMemo(
    () =>
      (customers.data?.data ?? []).map((customer) => ({
        value: customer.id,
        label: customer.name,
        hint: meta(`customerTypes.${customer.type}`),
      })),
    [customers.data, meta],
  );
  const productById = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.id, product])),
    [products.data],
  );
  const productOptions: ComboboxOption[] = useMemo(
    () =>
      (products.data ?? []).map((product) => ({
        value: product.id,
        label: product.name,
        hint: t('available', { quantity: formatQuantity(product.availableQty, product.unit) }),
        aside: <StockChip status={product.stockStatus} />,
      })),
    [products.data, t, formatQuantity],
  );

  const setRow = (index: number, change: Partial<OrderFormValues['items'][number]>) => {
    setValues((current) => ({
      ...current,
      items: current.items.map((row, i) => (i === index ? { ...row, ...change } : row)),
    }));
    setErrors((current) => ({
      ...current,
      items: undefined,
      rows: { ...current.rows, [index]: {} },
    }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const result = validateOrderForm(values, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    try {
      const order = await create.mutateAsync(result.data);
      toast.show(t('created', { code: order.code }));
      router.push(`/app/orders/${order.id}`);
    } catch (error) {
      setFailure(mapMutationError(error));
    }
  }

  const todayLabel = format.dateTime(calendarDateToUtc(today), {
    timeZone: 'UTC',
    dateStyle: 'long',
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/app/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        ← {detail('back')}
      </Link>
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('intro')}</p>
      </header>

      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
        <section className="space-y-4 rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
          <Field id="order-customer" label={t('customer')} error={message(errors.customerId)}>
            <Combobox
              id="order-customer"
              options={customerOptions}
              value={values.customerId}
              onChange={(customerId) => {
                setValues((current) => ({ ...current, customerId }));
                setErrors((current) => ({ ...current, customerId: undefined }));
              }}
              placeholder={t('customerSearch')}
              emptyText={t('noCustomers')}
              invalid={errors.customerId !== undefined}
              describedBy={errors.customerId ? 'order-customer-error' : undefined}
            />
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold">{t('priority')}</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[...ORDER_PRIORITIES].reverse().map((priority: OrderPriority) => (
                <label
                  key={priority}
                  className="flex cursor-pointer items-center justify-center rounded-2xl border border-border p-2.5 transition has-[:checked]:border-forest-500 has-[:checked]:bg-forest-50 has-[:checked]:shadow-[0_3px_0_0_var(--color-forest-500)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring dark:has-[:checked]:bg-forest-900/50"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={priority}
                    checked={values.priority === priority}
                    onChange={() => setValues((current) => ({ ...current, priority }))}
                    className="sr-only"
                  />
                  <PriorityBadge priority={priority} />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="order-due"
              label={t('dueDate')}
              hint={t('dueDateHint', { today: todayLabel })}
              error={message(errors.dueDate)}
            >
              <input
                id="order-due"
                type="date"
                min={today}
                value={values.dueDate}
                aria-invalid={errors.dueDate ? true : undefined}
                aria-describedby={errors.dueDate ? 'order-due-error' : 'order-due-hint'}
                onChange={(event) => {
                  setValues((current) => ({ ...current, dueDate: event.target.value }));
                  setErrors((current) => ({ ...current, dueDate: undefined }));
                }}
                className={inputClass}
              />
            </Field>
            <Field
              id="order-notes"
              label={t('notes')}
              optional={forms('optional')}
              error={message(errors.notes)}
            >
              <input
                id="order-notes"
                value={values.notes}
                maxLength={500}
                onChange={(event) =>
                  setValues((current) => ({ ...current, notes: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section
          aria-labelledby="order-items"
          className="space-y-3 rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6"
        >
          <h2 id="order-items" className="font-display text-lg font-semibold">
            {t('items')}
          </h2>
          {errors.items ? (
            <p
              role="alert"
              className="text-sm font-semibold text-critical-700 dark:text-critical-300"
            >
              {message(errors.items)}
            </p>
          ) : null}
          <ol className="space-y-3">
            {values.items.map((row, index) => {
              const product = productById.get(row.productId);
              const rowErrors = errors.rows[index] ?? {};
              const productId = `order-product-${String(index)}`;
              const qtyId = `order-qty-${String(index)}`;
              return (
                <li
                  key={index}
                  className="grid gap-3 rounded-2xl bg-surface-muted/60 p-3 sm:grid-cols-[1fr_11rem_auto] sm:items-start"
                >
                  <Field id={productId} label={t('product')} error={message(rowErrors.productId)}>
                    <Combobox
                      id={productId}
                      options={productOptions}
                      value={row.productId}
                      onChange={(value) => setRow(index, { productId: value })}
                      placeholder={t('productSearch')}
                      emptyText={t('noProducts')}
                      invalid={rowErrors.productId !== undefined}
                      describedBy={rowErrors.productId ? `${productId}-error` : undefined}
                    />
                  </Field>
                  <Field id={qtyId} label={t('quantity')} error={message(rowErrors.quantity)}>
                    <div className="relative">
                      <input
                        id={qtyId}
                        inputMode="decimal"
                        autoComplete="off"
                        value={row.quantity}
                        aria-invalid={rowErrors.quantity ? true : undefined}
                        aria-describedby={rowErrors.quantity ? `${qtyId}-error` : undefined}
                        onChange={(event) => setRow(index, { quantity: event.target.value })}
                        className={`${inputClass} pr-16`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                        {product ? units(product.unit) : '—'}
                      </span>
                    </div>
                  </Field>
                  <button
                    type="button"
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        items: current.items.filter((_, i) => i !== index),
                      }))
                    }
                    aria-label={t('removeItem', { name: product?.name ?? String(index + 1) })}
                    className="inline-flex size-11 items-center justify-center self-end justify-self-end rounded-full text-muted transition hover:bg-critical-50 hover:text-critical-700 sm:mt-7 dark:hover:bg-critical-900/30 dark:hover:text-critical-300"
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              );
            })}
          </ol>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="plus" className="size-4" />}
            disabled={values.items.length >= MAX_ORDER_ITEMS}
            onClick={() =>
              setValues((current) => ({ ...current, items: [...current.items, { ...EMPTY_ROW }] }))
            }
          >
            {t('addItem')}
          </Button>
        </section>

        {failure ? <MutationErrorBanner error={failure} /> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/app/orders"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold hover:bg-surface-muted"
          >
            {forms('cancel')}
          </Link>
          <Button type="submit" size="lg" icon={<Icon name="check" />} disabled={create.isPending}>
            {create.isPending ? forms('saving') : t('submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
