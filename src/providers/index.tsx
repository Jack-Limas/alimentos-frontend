import type { ReactNode } from 'react';
import { WebVitalsReporter } from '@/components/metrics/web-vitals-reporter';
import { ServiceWorkerUpdates } from '@/components/pwa/service-worker-updates';
import { AuthProvider } from '@/features/auth/auth-provider';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {/* Inside QueryProvider: logging out clears the query cache. */}
        <AuthProvider>
          {children}
          <WebVitalsReporter />
        </AuthProvider>
        <ServiceWorkerUpdates />
      </QueryProvider>
    </ThemeProvider>
  );
}

export { QueryProvider, ThemeProvider };
