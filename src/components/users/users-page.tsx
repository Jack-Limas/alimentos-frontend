'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { RoleBadge } from '@/components/auth';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { inputClass, selectClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ROLES, type AuthUser, type Role } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import { useUpdateUser, useUsers } from '@/features/users/api';
import { userRowActions } from '@/features/users/permissions';
import { usersQuery } from '@/features/users/query';
import type { ActiveFilter, ManagedUser } from '@/features/users/types';
import { mapUserError, type UserErrorView } from '@/features/users/user-errors';
import { loadErrorKey } from '@/lib/api';
import { BUSINESS_TIME_ZONE } from '@/lib/dates/business-calendar';
import { ProtectedBadge, StatusChip, UserErrorBanner } from './user-bits';
import { ConfirmDeactivateModal, ResetPasswordModal, UserFormModal } from './user-modals';

const SEARCH_DEBOUNCE_MS = 300;
interface RowHandlers {
  onEdit: (user: ManagedUser) => void;
  onToggle: (user: ManagedUser) => void;
  onReset: (user: ManagedUser) => void;
  togglePending: boolean;
}

function Identity({ user, me }: { user: ManagedUser; me: AuthUser }) {
  const t = useTranslations('Users');
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar userId={user.id} name={user.name} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
          <span className="truncate">{user.name}</span>
          {user.id === me.id ? (
            <span className="rounded-full bg-expiry-100 px-2 py-0.5 text-[0.7rem] font-semibold text-expiry-900 dark:bg-expiry-900/40 dark:text-expiry-200">
              {t('you')}
            </span>
          ) : null}
        </p>
        <p className="truncate text-sm text-muted">{user.email}</p>
      </div>
    </div>
  );
}

function Badges({ user }: { user: ManagedUser }) {
  const t = useTranslations('Users');
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusChip active={user.active} />
      {user.isProtected ? <ProtectedBadge /> : null}
      {user.mustChangePassword ? (
        <span
          title={t('pendingPasswordHint')}
          className="inline-flex items-center gap-1 rounded-full bg-expiry-100 px-2 py-0.5 text-xs font-semibold text-expiry-900 dark:bg-expiry-900/40 dark:text-expiry-200"
        >
          <Icon name="key" className="size-3.5" />
          {t('pendingPassword')}
        </span>
      ) : null}
    </div>
  );
}

/** Only the buttons the server would accept for this row (none for protected accounts). */
function RowActions({
  user,
  me,
  handlers,
}: {
  user: ManagedUser;
  me: AuthUser;
  handlers: RowHandlers;
}) {
  const t = useTranslations('Users');
  const actions = userRowActions(user, me);
  if (!actions.edit && !actions.toggleActive && !actions.resetPassword) return null;
  return (
    <div
      role="group"
      aria-label={t('actionsFor', { name: user.name })}
      className="flex flex-wrap gap-2"
    >
      {actions.edit ? (
        <Button
          variant="secondary"
          size="sm"
          icon={<Icon name="pencil" className="size-4" />}
          onClick={() => handlers.onEdit(user)}
        >
          {t('edit')}
        </Button>
      ) : null}
      {actions.resetPassword ? (
        <Button
          variant="secondary"
          size="sm"
          icon={<Icon name="key" className="size-4" />}
          onClick={() => handlers.onReset(user)}
        >
          {t('resetPassword')}
        </Button>
      ) : null}
      {actions.toggleActive ? (
        <Button
          variant={user.active ? 'ghost' : 'lagoon'}
          size="sm"
          disabled={handlers.togglePending}
          onClick={() => handlers.onToggle(user)}
        >
          {user.active ? t('deactivate') : t('activate')}
        </Button>
      ) : null}
    </div>
  );
}

function CreatedAt({ iso }: { iso: string }) {
  const format = useFormatter();
  return (
    <time dateTime={iso}>
      {format.dateTime(new Date(iso), {
        timeZone: BUSINESS_TIME_ZONE,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}
    </time>
  );
}

function UsersTable({
  users,
  me,
  handlers,
}: {
  users: ManagedUser[];
  me: AuthUser;
  handlers: RowHandlers;
}) {
  const t = useTranslations('Users.columns');
  return (
    <div className="hidden overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-border lg:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              {t('user')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('role')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('status')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('created')}
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              <span className="sr-only">{t('actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id} className={user.active ? '' : 'opacity-70'}>
              <td className="max-w-72 px-5 py-3">
                <Identity user={user} me={me} />
              </td>
              <td className="px-3 py-3">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-3 py-3">
                <Badges user={user} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-muted">
                <CreatedAt iso={user.createdAt} />
              </td>
              <td className="px-5 py-3">
                <div className="flex justify-end">
                  <RowActions user={user} me={me} handlers={handlers} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserCards({
  users,
  me,
  handlers,
}: {
  users: ManagedUser[];
  me: AuthUser;
  handlers: RowHandlers;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
      {users.map((user) => (
        <li
          key={user.id}
          className={`flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-border ${user.active ? '' : 'opacity-70'}`}
        >
          <Identity user={user} me={me} />
          <div className="flex flex-wrap items-center gap-1.5">
            <RoleBadge role={user.role} />
            <Badges user={user} />
          </div>
          <p className="text-xs text-muted">
            <CreatedAt iso={user.createdAt} />
          </p>
          <RowActions user={user} me={me} handlers={handlers} />
        </li>
      ))}
    </ul>
  );
}

export function UsersPage() {
  const t = useTranslations('Users');
  const roles = useTranslations('Auth.roles');
  const common = useTranslations('Common');
  const toast = useToast();
  const { user: me } = useAuth();
  const update = useUpdateUser();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ManagedUser | 'new' | null>(null);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [deactivating, setDeactivating] = useState<ManagedUser | null>(null);
  const [toggleFailure, setToggleFailure] = useState<UserErrorView | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const users = useUsers(usersQuery({ search: debounced, role, status, page }));
  if (me === null) return null;

  async function setActive(user: ManagedUser, active: boolean) {
    setToggleFailure(null);
    try {
      const saved = await update.mutateAsync({ id: user.id, patch: { active } });
      toast.show(
        active ? t('activated', { name: saved.name }) : t('deactivated', { name: saved.name }),
      );
      setDeactivating(null);
    } catch (error) {
      setToggleFailure(mapUserError(error));
    }
  }

  const handlers: RowHandlers = {
    onEdit: setEditing,
    onReset: setResetting,
    // Deactivating ends their sessions: confirm first. Activating is harmless.
    onToggle: (user) => {
      setToggleFailure(null);
      if (user.active) setDeactivating(user);
      else void setActive(user, true);
    },
    togglePending: update.isPending,
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
        </div>
        <Button icon={<Icon name="plus" />} onClick={() => setEditing('new')}>
          {t('newUser')}
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-border sm:grid-cols-[1fr_auto_auto] sm:p-5">
        <div className="relative">
          <label htmlFor="user-search" className="sr-only">
            {t('search')}
          </label>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted"
          />
          <input
            id="user-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className={`${inputClass} pl-10`}
          />
        </div>
        <div>
          <label htmlFor="user-role-filter" className="sr-only">
            {t('roleFilter')}
          </label>
          <select
            id="user-role-filter"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role | '');
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">{t('allRoles')}</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {roles(value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="user-status-filter" className="sr-only">
            {t('statusFilter')}
          </label>
          <select
            id="user-status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ActiveFilter);
              setPage(1);
            }}
            className={selectClass}
          >
            {(['all', 'active', 'inactive'] as const).map((value) => (
              <option key={value} value={value}>
                {t(`status.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {toggleFailure && deactivating === null ? <UserErrorBanner error={toggleFailure} /> : null}

      {users.isPending ? (
        <div aria-busy="true" className="grid grid-cols-1 gap-3">
          <p role="status" className="sr-only">
            {t('loading')}
          </p>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
      ) : users.isError ? (
        <EmptyState
          illustration="search"
          title={common(loadErrorKey(users.error))}
          action={
            <Button variant="secondary" onClick={() => void users.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : users.data.data.length === 0 ? (
        <EmptyState
          illustration="search"
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <div className={`space-y-4 ${users.isPlaceholderData ? 'opacity-60' : ''}`}>
          <p className="text-sm text-muted" aria-live="polite">
            {t('total', { total: users.data.meta.total })}
          </p>
          <UsersTable users={users.data.data} me={me} handlers={handlers} />
          <UserCards users={users.data.data} me={me} handlers={handlers} />
          <Pagination
            page={users.data.meta.page}
            pageSize={users.data.meta.pageSize}
            total={users.data.meta.total}
            onPageChange={setPage}
          />
        </div>
      )}

      <UserFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        user={editing === 'new' || editing === null ? undefined : editing}
        canChangeRole={
          editing === 'new' || editing === null ? true : userRowActions(editing, me).changeRole
        }
      />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDeactivateModal
        user={deactivating}
        pending={update.isPending}
        failure={toggleFailure}
        onConfirm={() => {
          if (deactivating) void setActive(deactivating, false);
        }}
        onClose={() => {
          setDeactivating(null);
          setToggleFailure(null);
        }}
      />
    </div>
  );
}
