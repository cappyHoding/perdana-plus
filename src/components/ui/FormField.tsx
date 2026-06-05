import React from 'react';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({ label, hint, error, required, children, className = '' }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-ink flex gap-1">
        {label}
        {required && <span className="text-red">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={[
        'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-yellow focus:border-yellow',
        'placeholder:text-ink-3',
        error
          ? 'border-red bg-red/5'
          : 'border-line bg-white hover:border-line-2',
        className,
      ].join(' ')}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={[
        'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-yellow focus:border-yellow',
        error
          ? 'border-red bg-red/5'
          : 'border-line bg-white hover:border-line-2',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  );
}
