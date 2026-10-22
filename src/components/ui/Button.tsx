import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border-line bg-surface-2 text-fg hover:border-line-strong hover:bg-surface',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', type = 'button', className = '', disabled, ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 ${variantClasses[variant]} ${className}`}
    />
  );
});
