import * as React from 'react';
import { AlertCircle, Loader2, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-sm dark:bg-amber-600 dark:hover:bg-amber-500',
      secondary: 'bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30',
      outline: 'border border-amber-500/30 bg-white/80 text-slate-800 hover:bg-amber-500/10 dark:border-amber-900/50 dark:bg-[#1e1510] dark:text-amber-100 dark:hover:bg-amber-950/30',
      ghost: 'bg-transparent text-slate-700 hover:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-950/30',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
    };

    const sizes = {
      sm: 'h-8.5 px-3 text-xs font-semibold rounded-xl gap-1.5',
      md: 'h-10 px-4 text-xs sm:text-sm font-semibold rounded-2xl gap-2',
      lg: 'h-12 px-5 text-sm sm:text-base font-bold rounded-2xl gap-2'
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold leading-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10.5 w-full rounded-2xl border border-amber-500/20 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-[#3e2e24] dark:bg-[#1c130d] dark:text-amber-100 dark:placeholder:text-amber-400/40',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10.5 w-full appearance-none rounded-2xl border border-amber-500/20 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-[#3e2e24] dark:bg-[#1c130d] dark:text-amber-100',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[100px] w-full rounded-2xl border border-amber-500/20 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-[#3e2e24] dark:bg-[#1c130d] dark:text-amber-100 dark:placeholder:text-amber-400/40',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const Badge = ({
  children,
  className,
  variant = 'default'
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) => {
  const variants = {
    default: 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20',
    success: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20',
    warning: 'bg-amber-500/20 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200 border border-amber-500/30',
    danger: 'bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300 border border-red-500/20',
    info: 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
  };

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap leading-snug', variants[variant], className)}>
      {children}
    </span>
  );
};

export const Avatar = ({
  name,
  src,
  size = 'md'
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };

  if (src) {
    return <img src={src} alt={name} className={cn('rounded-2xl object-cover ring-1 ring-amber-500/20', sizes[size])} />;
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className={cn('flex items-center justify-center rounded-2xl bg-amber-500/20 font-bold text-amber-800 dark:bg-amber-500/25 dark:text-amber-200 ring-1 ring-amber-500/20', sizes[size])}>
      {initials}
    </div>
  );
};

export const Alert = ({
  title,
  description,
  variant = 'default',
  icon
}: {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}) => {
  const variants = {
    default: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-[#3e2e24] dark:bg-[#1d140e] dark:text-amber-100',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
    danger: 'border-red-500/30 bg-red-500/10 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
  };

  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4', variants[variant])}>
      <div className="mt-0.5 shrink-0">{icon ?? <AlertCircle className="h-4 w-4" />}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-bold leading-snug">{title}</p>
        {description ? <p className="mt-1 text-xs leading-normal opacity-90">{description}</p> : null}
      </div>
    </div>
  );
};

export const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
  <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[20px] sm:rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 p-6 text-center dark:border-[#3e2e24] dark:bg-[#1b130e]/60">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 shadow-sm dark:bg-amber-500/20 dark:text-amber-300">
      <Sparkles className="h-5 w-5" />
    </div>
    <h3 className="mt-3 text-sm sm:text-base font-bold text-slate-800 dark:text-amber-100">{title}</h3>
    {description ? <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-amber-300/70 leading-normal">{description}</p> : null}
    {action ? <div className="mt-3">{action}</div> : null}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-2xl bg-amber-500/10 dark:bg-amber-950/30', className)} />;

export const Loading = ({ label = 'Memuat data...' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 rounded-[24px] border border-amber-500/20 bg-white/80 p-6 text-xs sm:text-sm font-semibold text-slate-700 dark:border-[#3e2e24] dark:bg-[#221812] dark:text-amber-200">
    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-amber-600" />
    {label}
  </div>
);

export const ModernTable = ({ headers, rows, className }: { headers: string[]; rows: React.ReactNode[][]; className?: string }) => (
  <div className={cn('overflow-hidden rounded-[20px] border border-amber-500/15 bg-white shadow-sm dark:border-[#3e2e24] dark:bg-[#221812]', className)}>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-amber-500/15 text-xs sm:text-sm dark:divide-amber-900/30">
        <thead className="bg-amber-500/5 dark:bg-amber-950/30">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-amber-300/80 whitespace-nowrap">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-500/10 dark:divide-amber-900/20">
          {rows.map((row, index) => (
            <tr key={index} className="bg-white/50 transition hover:bg-amber-500/5 dark:bg-[#221812] dark:hover:bg-amber-950/20">
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-3.5 py-3 text-xs sm:text-sm text-slate-800 dark:text-amber-100 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SearchBar = ({ placeholder = 'Cari...', className }: { placeholder?: string; className?: string }) => (
  <label className={cn('flex items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-600 shadow-sm transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 dark:border-[#3e2e24] dark:bg-[#1c130d] dark:text-amber-200', className)}>
    <Search className="h-4 w-4 text-slate-400 dark:text-amber-400/60" />
    <input type="text" placeholder={placeholder} className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-amber-400/40 text-xs sm:text-sm" />
  </label>
);
