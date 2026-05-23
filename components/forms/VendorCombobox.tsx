'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Vendor } from '@/lib/types';

export function filterSortVendors(list: Vendor[], query: string): Vendor[] {
  const t = query.trim().toLowerCase().replace(/\s/g, '');
  const filtered =
    t === ''
      ? [...list]
      : list.filter(
          v =>
            v.name.toLowerCase().includes(query.trim().toLowerCase()) ||
            v.gstin.toLowerCase().includes(t)
        );
  filtered.sort((a, b) => {
    const q = query.trim().toLowerCase();
    if (q === '') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    const aStarts = an.startsWith(q);
    const bStarts = bn.startsWith(q);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return filtered;
}

interface VendorComboboxProps {
  vendors: Vendor[];
  value: string;
  onChange: (vendorId: string) => void;
  disabled?: boolean;
  inputId?: string;
  label?: string;
  error?: string;
}

export function VendorCombobox({
  vendors,
  value,
  onChange,
  disabled = false,
  inputId = 'vendor-combobox',
  label = 'Vendor',
  error,
}: VendorComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    const v = vendors.find(x => x.id === value);
    if (v) setQuery(v.name);
  }, [value, vendors]);

  const suggestions = useMemo(() => filterSortVendors(vendors, query), [vendors, query]);

  function handleQueryChange(text: string) {
    if (disabled) return;
    setQuery(text);
    setOpen(true);
    const sel = vendors.find(v => v.id === value);
    if (!sel || sel.name !== text) {
      onChange('');
    }
  }

  function pickVendor(v: Vendor) {
    onChange(v.id);
    setQuery(v.name);
    setOpen(false);
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const listboxId = `${inputId}-list`;

  return (
    <div className="relative" ref={wrapRef}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        value={query}
        onChange={e => handleQueryChange(e.target.value)}
        onFocus={() => !disabled && setOpen(true)}
        disabled={disabled}
        placeholder={disabled ? '' : 'Type name or GSTIN…'}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-invalid={Boolean(error)}
      />
      {!disabled && open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-md"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
          ) : (
            suggestions.map(v => (
              <li key={v.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === v.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-900"
                  onMouseDown={e => {
                    e.preventDefault();
                    pickVendor(v);
                  }}
                >
                  <span className="font-medium">{v.name}</span>
                  <span className="text-slate-500 font-mono text-xs ml-2">{v.gstin}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {error ? (
        <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
