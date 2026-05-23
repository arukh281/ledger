import { InputHTMLAttributes, ReactNode } from 'react';
import { Search } from 'lucide-react';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  icon?: ReactNode;
}

export function SearchField({ icon, className = '', ...props }: SearchFieldProps) {
  return (
    <div className="search-field">
      {icon ?? <Search size={16} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />}
      <input type="search" className={`input-infix min-h-0 flex-1 py-0 ${className}`.trim()} {...props} />
    </div>
  );
}
