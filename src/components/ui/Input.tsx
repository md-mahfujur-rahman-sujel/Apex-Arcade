import React, { forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', disabled, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      disabled={disabled}
      className={`block min-h-11 w-full rounded-xl border border-line bg-sunken px-3 text-sm text-fg placeholder:text-fg-muted transition-colors hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', disabled, ...props },
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      disabled={disabled}
      className={`block min-h-11 w-full rounded-xl border border-line bg-sunken px-3 text-sm text-fg transition-colors hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
});
