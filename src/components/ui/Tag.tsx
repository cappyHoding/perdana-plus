import React from 'react';

type TagVariant = 'yellow' | 'red' | 'ok' | 'ink' | 'warn' | 'line';

interface TagProps {
  variant?: TagVariant;
  children: React.ReactNode;
  className?: string;
}

const tagStyles: Record<TagVariant, string> = {
  yellow: 'bg-yellow-tint text-ink border border-yellow-soft',
  red: 'bg-red/10 text-red border border-red/20',
  ok: 'bg-ok/10 text-ok border border-ok/20',
  ink: 'bg-ink text-white border border-ink',
  warn: 'bg-yellow-soft/40 text-warn border border-yellow-soft',
  line: 'bg-cream text-ink-2 border border-line',
};

export default function Tag({ variant = 'line', children, className = '' }: TagProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        tagStyles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
