'use client';

import { useSyncExternalStore } from 'react';
import { useClientValue } from '@/hooks/use-client-value';
import { useAlerts } from './api';
import { getSharedAlertsClient } from './browser-shared-alerts';
import { chooseAlertsMode, type AlertsMode, type SharedAlertsState } from './shared-alerts-client';
import type { Alert } from './types';

export interface AlertsView {
  data: Alert[] | undefined;
  dataUpdatedAt: number;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
  mode: AlertsMode;
  /** Tabs sharing the poll (shared mode only). */
  ports: number;
}

const noop = () => () => undefined;
const EMPTY: SharedAlertsState = {
  snapshot: null,
  ports: 0,
  polling: false,
  error: null,
  connected: false,
};

/**
 * Alerts for the badge, the dashboard and the alerts page. With SharedWorker
 * every tab gets them from one shared poll; without it each tab polls with
 * TanStack Query (useAlerts), as before.
 */
export function useSharedAlerts(): AlertsView {
  const mode = useClientValue<AlertsMode | 'unknown'>(() => chooseAlertsMode(window), 'unknown');
  const shared = mode === 'shared';
  const state = useSyncExternalStore(
    shared ? getSharedAlertsClient().subscribe : noop,
    shared ? getSharedAlertsClient().getState : () => EMPTY,
    () => EMPTY,
  );
  const perTab = useAlerts({ enabled: mode === 'per-tab' });

  if (shared) {
    return {
      data: state.snapshot?.alerts,
      dataUpdatedAt: state.snapshot?.fetchedAt ?? 0,
      isPending: state.snapshot === null && state.error === null,
      isError: state.snapshot === null && state.error !== null,
      isFetching: false,
      refetch: () => {
        getSharedAlertsClient().refetch();
      },
      mode: 'shared',
      ports: state.ports,
    };
  }
  return {
    data: perTab.data,
    dataUpdatedAt: perTab.dataUpdatedAt,
    isPending: perTab.isPending,
    isError: perTab.isError,
    isFetching: perTab.isFetching,
    refetch: () => {
      void perTab.refetch();
    },
    mode: 'per-tab',
    ports: 0,
  };
}
