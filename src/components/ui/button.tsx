import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'citrus' | 'lagoon' | 'berry';
type Size = 'sm' | 'md' | 'lg';

/**
 * 3D keycap buttons: a darker "edge" under the face (a solid box-shadow) that
 * the button sinks into when pressed. Hover lifts it a pixel. With reduced
 * motion only the colors change.
 */
const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold ' +
  'transition-[transform,box-shadow,background-color,color] duration-100 ' +
  'motion-safe:hover:-translate-y-px motion-safe:active:translate-y-[3px] ' +
  'disabled:pointer-events-none disabled:opacity-55';

/** Face color plus the edge color it sits on (`--edge`). */
const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground [--edge:var(--color-brand-800)] hover:bg-primary-hover dark:[--edge:var(--color-brand-700)]',
  secondary:
    'border border-border bg-surface text-foreground [--edge:var(--color-sand-300)] hover:bg-surface-muted dark:[--edge:var(--color-sand-700)]',
  ghost: 'text-foreground [--edge:transparent] hover:bg-surface-muted',
  danger: 'bg-critical-600 text-white [--edge:var(--color-critical-800)] hover:bg-critical-700',
  citrus: 'bg-expiry-300 text-forest-950 [--edge:var(--color-expiry-600)] hover:bg-expiry-200',
  lagoon: 'bg-lagoon-600 text-white [--edge:var(--color-lagoon-800)] hover:bg-lagoon-700',
  berry: 'bg-berry-600 text-white [--edge:var(--color-berry-800)] hover:bg-berry-700',
};

/** Edge depth: 4px at rest, 1px when pressed. */
const depth =
  'shadow-[0_4px_0_0_var(--edge),0_6px_14px_-6px_rgb(0_0_0/0.35)] ' +
  'active:shadow-[0_1px_0_0_var(--edge),0_2px_6px_-4px_rgb(0_0_0/0.3)]';

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-7 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md'): string {
  return `${base} ${variants[variant]} ${variant === 'ghost' ? '' : depth} ${sizes[size]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}
