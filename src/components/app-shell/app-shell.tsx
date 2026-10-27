'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/use-auth';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';

/** Private app frame: sidebar on desktop, bottom bar on phones, toasts for both. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user === null) return null;

  return (
    <ToastProvider>
      <div data-app-shell className="bg-app-pattern">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[16rem_1fr] lg:py-8">
          <Sidebar user={user} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
      <BottomNav role={user.role} />
    </ToastProvider>
  );
}
