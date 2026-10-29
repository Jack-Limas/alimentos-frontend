'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { serviceWorkerUrl, shouldRegister, watchForUpdates } from '@/features/pwa/service-worker';

/**
 * Registers the service worker in production and shows "New version
 * available · Reload" when a new one is waiting. Reloading asks the waiting
 * worker to take over, and the page reloads once it controls it. The first
 * install also changes the controller (clients.claim): that one must not
 * reload the page, so only a reload the user asked for does.
 */
export function ServiceWorkerUpdates() {
  const t = useTranslations('Pwa');
  const [waiting, setWaiting] = useState<ServiceWorkerRegistration | null>(null);
  const userAskedToReload = useRef(false);

  useEffect(() => {
    if (!shouldRegister(process.env.NODE_ENV, window)) return;
    const onControllerChange = () => {
      if (!userAskedToReload.current) return;
      userAskedToReload.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker
      .register(serviceWorkerUrl(process.env.NEXT_PUBLIC_APP_VERSION), { scope: '/' })
      .then((registration) => {
        watchForUpdates(
          registration,
          () => navigator.serviceWorker.controller !== null,
          () => setWaiting(registration),
        );
      })
      .catch(() => undefined);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-forest-900 px-4 py-3 text-sm text-white shadow-[0_18px_40px_-15px_rgba(0,0,0,0.6)] ring-1 ring-forest-700 motion-safe:animate-rise-in lg:bottom-6"
    >
      <Icon name="flame" className="size-5 shrink-0 text-expiry-300" />
      <span className="flex-1 font-semibold">{t('updateAvailable')}</span>
      <Button
        variant="citrus"
        size="sm"
        onClick={() => {
          userAskedToReload.current = true;
          waiting.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }}
      >
        {t('reload')}
      </Button>
    </div>
  );
}
