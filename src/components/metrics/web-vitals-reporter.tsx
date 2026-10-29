'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { useAuth } from '@/features/auth/use-auth';
import { createVitalsReporter, type VitalSample } from '@/features/metrics/vitals-reporter';

/**
 * Sends INP, LCP, CLS, TTFB and FCP to POST /metrics/web-vitals, only while
 * there is a session. keepalive lets the request outlive the page (INP and
 * CLS are reported when it is hidden). Renders nothing.
 */
export function WebVitalsReporter() {
  const { status, authFetch } = useAuth();
  const pathname = usePathname();
  // The callbacks are registered once per page load: they read the latest values from refs.
  const latest = useRef({ status, authFetch, pathname });
  useEffect(() => {
    latest.current = { status, authFetch, pathname };
  }, [status, authFetch, pathname]);

  useEffect(() => {
    const report = createVitalsReporter({
      send: (sample: VitalSample) =>
        latest.current.authFetch('/metrics/web-vitals', {
          method: 'POST',
          json: sample,
          keepalive: true,
        }),
      hasSession: () => latest.current.status === 'authenticated',
      currentPath: () => latest.current.pathname,
      loadedPath: window.location.pathname,
    });
    onINP(report);
    onLCP(report);
    onCLS(report);
    onTTFB(report);
    onFCP(report);
  }, []);

  return null;
}
