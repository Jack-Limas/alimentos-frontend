import { useTranslations } from 'next-intl';
import type { Role } from '@/features/auth/types';

const tone: Record<Role, string> = {
  ADMIN: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  OPERATOR: 'bg-sand-200 text-sand-800 dark:bg-sand-800 dark:text-sand-100',
};

export function RoleBadge({ role }: { role: Role }) {
  const t = useTranslations('Auth.roles');

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[role]}`}
    >
      {t(role)}
    </span>
  );
}
