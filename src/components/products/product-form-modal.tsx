'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { MutationErrorBanner } from '@/components/inventory/mutation-error-banner';
import { Button } from '@/components/ui/button';
import { Field, fieldAria, inputClass, selectClass } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  productFormSchema,
  validateForm,
  type FieldErrors,
  type FormValues,
} from '@/features/inventory/form-validation';
import { mapMutationError, type MutationErrorView } from '@/features/inventory/mutation-errors';
import { UNITS } from '@/features/inventory/types';
import { useCreateProduct, useUpdateProduct } from '@/features/products/api';
import { CATEGORIES, PRODUCT_STATUSES, type Product } from '@/features/products/types';
import { useRouter } from '@/i18n/navigation';

type Values = FormValues<typeof productFormSchema>;

function initialValues(product: Product | undefined): Values {
  return {
    name: product?.name ?? '',
    category: product?.category ?? 'GRAINS_LEGUMES',
    unit: product?.unit ?? 'KG',
    minStock: product ? String(product.minStock) : '',
    status: product?.status ?? 'ACTIVE',
  };
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Edits this product; without it the form creates one. */
  product?: Product;
}

function ProductForm({ product, onClose }: { product?: Product; onClose: () => void }) {
  const t = useTranslations('ProductForm');
  const forms = useTranslations('Forms');
  const catalog = useTranslations('Catalog');
  const toast = useToast();
  const router = useRouter();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? '');
  const [values, setValues] = useState<Values>(() => initialValues(product));
  const [errors, setErrors] = useState<FieldErrors<keyof Values>>({});
  const [failure, setFailure] = useState<MutationErrorView | null>(null);
  const pending = create.isPending || update.isPending;

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
    const result = validateForm(productFormSchema, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const { status, ...input } = result.data;
    try {
      if (product) {
        const saved = await update.mutateAsync({ ...input, status });
        toast.show(t('updated', { name: saved.name }));
        onClose();
      } else {
        const created = await create.mutateAsync(input);
        toast.show(t('created', { name: created.name }));
        onClose();
        router.push(`/app/products/${created.id}`);
      }
    } catch (error) {
      const view = mapMutationError(error);
      if (view.kind === 'duplicateName') setErrors({ name: undefined });
      setFailure(view);
    }
  }

  const duplicate = failure?.kind === 'duplicateName';

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      <Field
        id="product-name"
        label={t('name')}
        error={duplicate ? forms('mutationErrors.duplicateName') : errorOf('name')}
      >
        <input
          {...fieldAria('product-name', duplicate ? 'duplicate' : errorOf('name'))}
          value={values.name}
          onChange={(event) => {
            set('name')(event.target.value);
            if (duplicate) setFailure(null);
          }}
          maxLength={120}
          autoComplete="off"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="product-category" label={t('category')} error={errorOf('category')}>
          <select
            {...fieldAria('product-category', errorOf('category'))}
            value={values.category}
            onChange={(event) => set('category')(event.target.value)}
            className={selectClass}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {catalog(`categories.${category}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="product-unit" label={t('unit')} error={errorOf('unit')}>
          <select
            {...fieldAria('product-unit', errorOf('unit'))}
            value={values.unit}
            onChange={(event) => set('unit')(event.target.value)}
            className={selectClass}
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {catalog(`units.long.${unit}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="product-min-stock"
        label={t('minStock')}
        hint={t('minStockHint')}
        error={errorOf('minStock')}
      >
        <input
          {...fieldAria('product-min-stock', errorOf('minStock'), t('minStockHint'))}
          value={values.minStock}
          onChange={(event) => set('minStock')(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className={inputClass}
        />
      </Field>

      {product ? (
        <Field id="product-status" label={t('status')} error={errorOf('status')}>
          <select
            {...fieldAria('product-status', errorOf('status'))}
            value={values.status}
            onChange={(event) => set('status')(event.target.value)}
            className={selectClass}
          >
            {PRODUCT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {catalog(`productStatus.${status}`)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {failure && !duplicate ? <MutationErrorBanner error={failure} /> : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {forms('cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? forms('saving') : product ? t('save') : t('create')}
        </Button>
      </div>
    </form>
  );
}

export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const t = useTranslations('ProductForm');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? t('editTitle', { name: product.name }) : t('createTitle')}
      description={product ? t('editDescription') : t('createDescription')}
    >
      <ProductForm product={product} onClose={onClose} />
    </Modal>
  );
}
