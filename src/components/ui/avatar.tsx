'use client';

import { initialsOf } from '@/components/layout/initials';
import { useAvatar } from '@/features/profile/use-avatar';

/** Gradients for people without a photo, picked from the name so each person keeps theirs. */
const GRADIENTS = [
  'from-brand-400 to-forest-600',
  'from-lagoon-400 to-lagoon-700',
  'from-berry-400 to-berry-700',
  'from-expiry-300 to-expiry-600',
  'from-forest-300 to-lagoon-600',
] as const;

export function gradientFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length] ?? GRADIENTS[0];
}

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
} as const;

interface AvatarProps {
  userId: string;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}

/** The user's photo, or their initials on a gradient. Decorative: the name is always written nearby. */
export function Avatar({ userId, name, size = 'md', className = '' }: AvatarProps) {
  const { photo } = useAvatar(userId);
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-surface ${sizes[size]} ${className}`;

  if (photo) {
    return (
      // A data URL from this browser: next/image would add nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" aria-hidden="true" className={`${base} object-cover`} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${base} bg-gradient-to-br font-display font-semibold text-white ${gradientFor(name)}`}
    >
      {initialsOf(name)}
    </span>
  );
}
