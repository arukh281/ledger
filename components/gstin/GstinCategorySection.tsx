'use client';

import { Check, Pencil, Trash2, X } from 'lucide-react';
import {
  GSTIN_CATEGORY_LABELS,
  type GstinCategory,
  type GstinRow,
  gstinRowKey,
} from '@/lib/gstin/types';

const compactInput = '!min-h-[2rem] !py-1.5 !px-2.5 !text-sm';

interface GstinCategorySectionProps {
  category: GstinCategory;
  rows: GstinRow[];
  gstinLabel?: string;
  editingKey: string | null;
  editName: string;
  editGstin: string;
  savingEdit: boolean;
  onEditNameChange: (value: string) => void;
  onEditGstinChange: (value: string) => void;
  onStartEdit: (row: GstinRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: (row: GstinRow) => void;
  onDelete: (row: GstinRow) => void;
}

export function GstinCategorySection({
  category,
  rows,
  gstinLabel = 'GSTIN',
  editingKey,
  editName,
  editGstin,
  savingEdit,
  onEditNameChange,
  onEditGstinChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: GstinCategorySectionProps) {
  const readOnly = category === 'party';

  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-base font-semibold text-slate-900">
        {GSTIN_CATEGORY_LABELS[category]}
      </h2>

      <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
              <th className="py-2.5 px-4 font-semibold text-slate-700">Firm name</th>
              <th className={`py-2.5 px-4 font-semibold text-slate-700 ${readOnly ? '' : 'w-40'}`}>
                {gstinLabel}
              </th>
              {!readOnly && (
                <th className="py-2.5 px-2 font-semibold text-slate-700 w-[4.5rem]">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 2 : 3}
                  className="py-6 px-4 text-center text-slate-500 text-sm"
                >
                  {readOnly ? 'No party vendors yet' : 'No firms in this category'}
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const key = gstinRowKey(row.category, row.id);
                const isEditing = !readOnly && editingKey === key;
                return (
                  <tr
                    key={key}
                    className={`border-b border-slate-100 last:border-0 ${isEditing ? 'bg-amber-50/40' : ''}`}
                  >
                    <td className="py-2 px-4 text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => onEditNameChange(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') onSaveEdit(row);
                            if (e.key === 'Escape') onCancelEdit();
                          }}
                          aria-label="Edit firm name"
                          className={`${compactInput} w-full`}
                          autoFocus
                        />
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="py-2 px-4 font-mono text-xs text-slate-800">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editGstin}
                          onChange={e => onEditGstinChange(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter') onSaveEdit(row);
                            if (e.key === 'Escape') onCancelEdit();
                          }}
                          aria-label={`Edit ${gstinLabel}`}
                          maxLength={15}
                          className={`${compactInput} w-full font-mono`}
                        />
                      ) : (
                        row.gstin || '—'
                      )}
                    </td>
                    {!readOnly && (
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-0.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onSaveEdit(row)}
                                disabled={savingEdit}
                                className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-50 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                aria-label="Save changes"
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={onCancelEdit}
                                disabled={savingEdit}
                                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                aria-label="Cancel edit"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onStartEdit(row)}
                                disabled={editingKey !== null}
                                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-0 bg-transparent cursor-pointer disabled:opacity-40"
                                aria-label={`Edit ${row.name}`}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(row)}
                                disabled={editingKey !== null}
                                className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 border-0 bg-transparent cursor-pointer disabled:opacity-40"
                                aria-label={`Delete ${row.name}`}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
