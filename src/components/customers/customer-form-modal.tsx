'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { MutationErrorBanner } from '@/components/inventory/mutation-error-banner';
import { Button } from '@/components/ui/button';
import { Field, fieldAria, inputClass, selectClass } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useCreateCustomer, useUpdateCustomer } from '@/features/customers/api';
import {
  toCustomerPatch,
  validateCustomerForm,
  type CustomerFormErrorKey,
  type CustomerFormErrors,
  type CustomerFormValues,
} from '@/features/customers/customer-form';
import { CUSTOMER_TYPES, type Customer } from '@/features/customers/types';
import { mapMutationError, type MutationErrorView } from '@/features/inventory/mutation-errors';

function CustomerForm({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const t = useTranslations('Customers.form');
  const forms = useTranslations('Forms');
  const meta = useTranslations('OrderMeta.customerTypes');
  const toast = useToast();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const [values, setValues] = useState<CustomerFormValues>({
    name: customer?.name ?? '',
    type: customer?.type ?? 'SUPERMARKET',
    address: customer?.address ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
  });
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [failure, setFailure] = useState<MutationErrorView | null>(null);
  const pending = create.isPending || update.isPending;

  const message = (key: CustomerFormErrorKey | undefined) =>
    key === undefined
      ? undefined
      : key === 'invalidPhone' || key === 'invalidEmail'
        ? t(`errors.${key}`)
        : forms(`errors.${key}`);

  const set = (field: keyof CustomerFormValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const result = validateCustomerForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    try {
      if (customer) {
        const saved = await update.mutateAsync({
          id: customer.id,
          patch: toCustomerPatch(result.data),
        });
        toast.show(t('updated', { name: saved.name }));
      } else {
        const created = await create.mutateAsync(result.data);
        toast.show(t('created', { name: created.name }));
      }
      onClose();
    } catch (error) {
      setFailure(mapMutationError(error));
    }
  }

  const text = (
    field: 'name' | 'address' | 'phone' | 'email',
    max: number,
    optional = false,
    type = 'text',
  ) => (
    <Field
      id={`customer-${field}`}
      label={t(field)}
      optional={optional ? forms('optional') : undefined}
      error={message(errors[field])}
    >
      <input
        {...fieldAria(`customer-${field}`, message(errors[field]))}
        type={type}
        value={values[field]}
        maxLength={max}
        onChange={(event) => set(field)(event.target.value)}
        className={inputClass}
      />
    </Field>
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      {text('name', 120)}
      <Field id="customer-type" label={t('type')} error={message(errors.type)}>
        <select
          {...fieldAria('customer-type', message(errors.type))}
          value={values.type}
          onChange={(event) => set('type')(event.target.value)}
          className={selectClass}
        >
          {CUSTOMER_TYPES.map((type) => (
            <option key={type} value={type}>
              {meta(type)}
            </option>
          ))}
        </select>
      </Field>
      {text('address', 200)}
      <div className="grid gap-4 sm:grid-cols-2">
        {text('phone', 24, true, 'tel')}
        {text('email', 254, true, 'email')}
      </div>

      {failure ? <MutationErrorBanner error={failure} /> : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {forms('cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? forms('saving') : customer ? t('save') : t('create')}
        </Button>
      </div>
    </form>
  );
}

export function CustomerFormModal({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}) {
  const t = useTranslations('Customers.form');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? t('editTitle', { name: customer.name }) : t('createTitle')}
      description={t('description')}
    >
      <CustomerForm key={customer?.id ?? 'new'} customer={customer} onClose={onClose} />
    </Modal>
  );
}
