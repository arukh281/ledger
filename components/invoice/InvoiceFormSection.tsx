import { ReactNode } from 'react';

interface InvoiceFormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Section heading + content without an extra card shell. */
export function InvoiceFormSection({
  title,
  description,
  children,
  className = '',
}: InvoiceFormSectionProps) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      <div>
        <h2 className="m-0 text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="m-0 mt-1 text-sm text-slate-500 leading-snug">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
