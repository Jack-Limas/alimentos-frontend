import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'citrus';
type Size = 'sm' | 'md';

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition duration-150 ' +
  // Pressed feedback: a short squash, like a physical key. Reduced motion keeps only the color.
  'active:scale-[0.96] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-55';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_2px_0_0_var(--color-brand-800)] hover:bg-primary-hover active:shadow-none dark:shadow-[0_2px_0_0_var(--color-brand-700)]',
  secondary: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
  ghost: 'text-foreground hover:bg-surface-muted',
  danger:
    'bg-critical-600 text-white shadow-[0_2px_0_0_var(--color-critical-800)] hover:bg-critical-700 active:shadow-none',
  citrus:
    'bg-expiry-300 text-forest-950 shadow-[0_2px_0_0_var(--color-expiry-600)] hover:bg-expiry-200 active:shadow-none',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md'): string {
  return `${base} ${variants[variant]} ${sizes[size]}`;
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
