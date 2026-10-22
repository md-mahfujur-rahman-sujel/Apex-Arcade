import React, { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className = '', ...props },
  ref,
) {
  const interactiveClasses = interactive
    ? 'transition-transform hover:-translate-y-0.5 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
    : '';

  return (
    <div
      {...props}
      ref={ref}
      className={`relative overflow-hidden rounded-2xl border border-line bg-card text-fg shadow-card ${interactiveClasses} ${className}`}
    />
  );
});
