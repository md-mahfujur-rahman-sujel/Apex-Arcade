import React, { forwardRef } from 'react';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, type = 'button', className = '', disabled, ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-medium whitespace-nowrap transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg'} ${className}`}
    />
  );
});
