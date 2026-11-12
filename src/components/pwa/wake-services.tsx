'use client';

import { useEffect } from 'react';

/** sessionStorage: once per tab (a reload keeps it, a new tab does not). */
export const WAKE_STORAGE_KEY = 'aiq.wake';

/** Returns true the first time it is called in this tab. Storage errors count as "first time". */
export function claimWakeForTab(storage: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  try {
    if (!storage) return true;
    if (storage.getItem(WAKE_STORAGE_KEY) !== null) return false;
    storage.setItem(WAKE_STORAGE_KEY, '1');
    return true;
  } catch {
    return true;
  }
}

/**
 * Asks /api/wake to wake the Render services, once per tab, without waiting
 * for it and without showing anything: if it fails, the page works the same.
 */
export function WakeServices() {
  useEffect(() => {
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
    if (!claimWakeForTab(storage)) return;
    void fetch('/api/wake', { cache: 'no-store' }).catch(() => undefined);
  }, []);
  return null;
}
