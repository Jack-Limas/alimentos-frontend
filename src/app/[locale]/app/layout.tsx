import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth/guards';

// Private pages are useless to crawlers and only render a skeleton without a session.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Private area, rendered on the client (CSR). The static HTML is the loading
 * skeleton; RequireAuth swaps in the page once the session is known, or sends
 * the user to the login. The API is what actually enforces access.
 */
export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
