'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { useAuth } from '@/features/auth/use-auth';
import {
  createVitalsReporter,
  type ReporterSession,
  type VitalSample,
} from '@/features/metrics/vitals-reporter';

/**
 * Sends INP, LCP, CLS, TTFB and FCP to POST /metrics/web-vitals, only while
 * there is a session. keepalive lets the request outlive the page (INP and
 * CLS are reported when it is hidden). Renders nothing.
 */
export function WebVitalsReporter() {
  const { status, authFetch } = useAuth();
  const pathname = usePathname();
  // The callbacks are registered once per page load: they read the latest values from refs.
  const latest = useRef<{ status: ReporterSession; authFetch: typeof authFetch; pathname: string }>(
    { status, authFetch, pathname },
  );
  const reporter = useRef<ReturnType<typeof createVitalsReporter> | null>(null);

  useEffect(() => {
    const created = createVitalsReporter({
      send: (sample: VitalSample) =>
        latest.current.authFetch('/metrics/web-vitals', {
          method: 'POST',
          json: sample,
          keepalive: true,
        }),
      session: () => latest.current.status,
      currentPath: () => latest.current.pathname,
      loadedPath: window.location.pathname,
    });
    onINP(created.report);
    onLCP(created.report);
    onCLS(created.report);
    onTTFB(created.report);
    onFCP(created.report);
    reporter.current = created;
  }, []);

  useEffect(() => {
    latest.current = { status, authFetch, pathname };
    // TTFB and FCP arrive before the session is restored: send them once it is.
    reporter.current?.sessionChanged();
  }, [status, authFetch, pathname]);

  return null;
}
