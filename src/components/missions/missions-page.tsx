'use client';

import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Celebration } from '@/components/ui/celebration';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/use-auth';
import {
  MISSION_STATUSES,
  readCompleted,
  recordCompleted,
  sortMissions,
} from '@/features/missions/missions';
import { useChangeOrderStatus, useOrders } from '@/features/orders/api';
import { mapStatusError } from '@/features/orders/status-errors';
import type { Order, OrderStatus } from '@/features/orders/types';
import { businessToday } from '@/lib/dates';
import { MissionCard } from './mission-card';

const QUERY = `status=${MISSION_STATUSES.join(',')}&pageSize=100`;
const COUNTER_EVENT = 'aiq:missions';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(COUNTER_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(COUNTER_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function MissionsPage() {
  const t = useTranslations('Missions');
  const common = useTranslations('Common');
  const statusLabel = useTranslations('OrderMeta.status');
  const errors = useTranslations('Orders.statusErrors');
  const toast = useToast();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const today = businessToday();
  // Missions move fast in the warehouse: refresh every 30 s.
  const missions = useOrders(QUERY, { refetchInterval: 30_000 });
  const change = useChangeOrderStatus();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const completed = useSyncExternalStore(
    subscribe,
    () => readCompleted(storage(), userId, today),
    () => 0,
  );

  async function advance(order: Order, to: OrderStatus) {
    setBusyId(order.id);
    try {
      await change.mutateAsync({ id: order.id, status: to });
      if (to === 'DELIVERED') {
        recordCompleted(storage(), userId, today);
        window.dispatchEvent(new Event(COUNTER_EVENT));
        setBurst((value) => value + 1);
        toast.show(t('celebrate', { code: order.code }));
      } else {
        toast.show(t('advanced', { code: order.code, status: statusLabel(to) }));
      }
    } catch (error) {
      toast.show(errors(mapStatusError(error)), 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (user === null) return null;
  const list = missions.data ? sortMissions(missions.data.data) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="relative overflow-hidden rounded-[1.75rem] bg-forest-900 p-5 text-forest-50 shadow-card ring-1 ring-forest-800 sm:p-7 dark:bg-forest-950">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-expiry-300/30 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-10 size-40 rounded-full bg-lagoon-400/25 blur-3xl"
        />
        <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-expiry-200">
          {t('eyebrow')}
        </p>
        <h1 className="relative mt-1 font-display text-3xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="relative mt-1 max-w-xl text-sm text-forest-100">{t('intro')}</p>
        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <span className="relative inline-flex items-center gap-2 rounded-full bg-expiry-300 px-4 py-2 text-sm font-bold text-forest-950 shadow-[0_3px_0_0_var(--color-expiry-600)]">
            <Icon name="trophy" className="size-4.5" />
            <span role="status">{t('completedToday', { count: completed })}</span>
            <Celebration burstKey={burst} />
          </span>
          {missions.data ? (
            <span className="rounded-full bg-forest-800 px-3 py-2 text-sm font-semibold text-forest-100">
              {t('pending', { count: list.length })}
            </span>
          ) : null}
          {completed >= 3 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-berry-500 px-3 py-2 text-sm font-bold text-white">
              <Icon name="flame" className="size-4" />
              {t('streak', { count: completed })}
            </span>
          ) : null}
        </div>
      </header>

      {missions.isPending ? (
        <div aria-busy="true" className="space-y-4">
          <p role="status" className="sr-only">
            {t('loading')}
          </p>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-[1.6rem]" />
          ))}
        </div>
      ) : missions.isError ? (
        <EmptyState
          illustration="search"
          title={common('loadError')}
          action={
            <Button variant="secondary" onClick={() => void missions.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState title={t('empty.title')} description={t('empty.description')} />
      ) : (
        <ul className="space-y-4">
          {list.map((order, index) => (
            <MissionCard
              key={order.id}
              order={order}
              role={user.role}
              busy={busyId === order.id}
              onAdvance={(target, to) => void advance(target, to)}
              index={index}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
