import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'danger' | 'ghost' | 'outline' | 'invoice' | 'payment';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-slate-900 hover:bg-slate-800 text-white border-slate-900',
  danger:
    'bg-red-700 hover:bg-red-800 text-white border-red-700',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent',
  outline:
    'bg-white hover:bg-slate-50 text-slate-800 border-slate-300',
  invoice:
    'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200',
  payment:
    'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200',
};

export function Button({
  variant = 'primary',
  children,
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-1.5',
        'font-medium border text-sm rounded-md cursor-pointer',
        'transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'px-4 py-2 min-h-[2.25rem]',
        styles[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
