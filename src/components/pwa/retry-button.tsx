'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';

/** Reloads the page the user was trying to open (the URL did not change). */
export function RetryButton({ label }: { label: string }) {
  return (
    <Button
      variant="citrus"
      icon={<Icon name="arrows" className="size-4" />}
      onClick={() => window.location.reload()}
    >
      {label}
    </Button>
  );
}
