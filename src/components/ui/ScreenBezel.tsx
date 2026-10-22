import React, { forwardRef } from 'react';

interface ScreenBezelProps extends React.HTMLAttributes<HTMLDivElement> {
  framed?: boolean;
}

export const ScreenBezel = forwardRef<HTMLDivElement, ScreenBezelProps>(function ScreenBezel(
  { framed = true, className = '', ...props },
  ref,
) {
  const frameClasses = framed
    ? 'rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
    : '';

  return (
    <div
      {...props}
      ref={ref}
      className={`relative overflow-hidden bg-stage ${frameClasses} ${className}`}
    />
  );
});
