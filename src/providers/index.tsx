import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/auth-provider';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {/* Inside QueryProvider: logging out clears the query cache. */}
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export { QueryProvider, ThemeProvider };
