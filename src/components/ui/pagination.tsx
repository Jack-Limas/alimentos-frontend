'use client';

import { useTranslations } from 'next-intl';
import { Button } from './button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const t = useTranslations('Common.pagination');
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <nav
      aria-label={t('label')}
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted">
        {t('total', { total })} · {t('status', { page, pages })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← {t('previous')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('next')} →
        </Button>
      </div>
    </nav>
  );
}
